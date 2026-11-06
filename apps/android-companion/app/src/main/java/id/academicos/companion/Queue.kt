package id.academicos.companion

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Base64
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

class Queue(context: Context) : SQLiteOpenHelper(context.applicationContext, "capture.db", null, 2), AutoCloseable {
    private val app = context.applicationContext
    private val vault = AndroidQueueKeys()
    private var closed = false
    init { synchronized(lock) { live.add(this) } }

    // API 28 SQLiteOpenHelper does not implement AutoCloseable.
    override fun close() = synchronized(lock) {
        super.close()
        closed = true
        live.remove(this)
        Unit
    }
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE events(id TEXT PRIMARY KEY,fingerprint TEXT UNIQUE NOT NULL,payload BLOB NOT NULL,created INTEGER NOT NULL)")
    }
    override fun onUpgrade(db: SQLiteDatabase, old: Int, next: Int) {
        // Never silently destroy legacy queued evidence or migrate public hashes.
        QueuePrivacy.requireCurrentFormat(old)
    }
    private fun <T> access(block: () -> T): T = synchronized(lock) {
        if (closed || app.getSharedPreferences("queue-repair", 0).getBoolean("pending", false))
            throw QueueUnavailable("QUEUE_RESET_REQUIRED")
        block()
    }
    private fun rowCount() = readableDatabase.rawQuery("SELECT count(*) FROM events", null).use { it.moveToFirst(); it.getInt(0) }
    private fun pairedCiphertext(): Boolean {
        val prefs = app.getSharedPreferences("private-pairing", 0)
        return prefs.contains("config") || prefs.contains("batch")
    }
    private fun key(additionalCiphertext: Boolean = false): javax.crypto.SecretKey {
        val queued = rowCount() > 0
        if (queued) QueuePrivacy.deduplicationKey(vault, true)
        return QueuePrivacy.encryptionKey(vault, queued || pairedCiphertext() || additionalCiphertext)
    }
    fun count(): Int = access {
        val count = rowCount()
        if (count > 0 || pairedCiphertext()) key()
        if (count > 0) QueuePrivacy.deduplicationKey(vault, true)
        count
    }
    fun add(payload: String) = access {
        // A scheduled callback cannot repopulate the queue after pause/reset.
        if (!app.getSharedPreferences("capture", 0).getBoolean("enabled", false)) return@access
        // Check keys BEFORE retention writes; expiry must not hide key loss.
        val encryption = key()
        val dedupe = QueuePrivacy.deduplicationKey(vault, rowCount() > 0)
        val db = writableDatabase
        val prefs = app.getSharedPreferences("health", 0)
        val removed = db.delete("events", "created < ?", arrayOf((System.currentTimeMillis() - 14L * 86400000).toString()))
        if (removed > 0) prefs.edit().putInt("gaps", prefs.getInt("gaps", 0) + removed).apply()
        val size = db.rawQuery("SELECT coalesce(sum(length(payload)),0) FROM events", null).use { it.moveToFirst(); it.getLong(0) }
        val bytes = payload.toByteArray(Charsets.UTF_8)
        if (size + bytes.size + 28 > 50L * 1024 * 1024) {
            prefs.edit().putInt("gaps", prefs.getInt("gaps", 0) + 1).apply()
            return@access
        }
        val fingerprint = Base64.encodeToString(QueuePrivacy.fingerprint(payload, dedupe), Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, encryption) }
        val values = android.content.ContentValues().apply {
            put("id", UUID.randomUUID().toString()); put("fingerprint", fingerprint)
            put("payload", cipher.iv + cipher.doFinal(bytes)); put("created", System.currentTimeMillis())
        }
        db.insertWithOnConflict("events", null, values, SQLiteDatabase.CONFLICT_IGNORE)
        Unit
    }
    fun seal(text: String): String = access {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        Base64.encodeToString(cipher.iv + cipher.doFinal(text.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
    }
    private fun decrypt(data: ByteArray): String {
        if (data.size < 28) throw QueueUnavailable("CIPHERTEXT_UNREADABLE")
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(true), GCMParameterSpec(128, data.copyOfRange(0, 12)))
        return String(cipher.doFinal(data.copyOfRange(12, data.size)), Charsets.UTF_8)
    }
    fun open(text: String): String = access { decrypt(Base64.decode(text, Base64.NO_WRAP)) }
    fun events(): List<Pair<String, JSONObject>> = access {
        readableDatabase.rawQuery("SELECT id,payload,created FROM events ORDER BY created,id LIMIT 50", null).use { cursor ->
            val items = mutableListOf<Pair<String, JSONObject>>()
            while (cursor.moveToNext()) {
                val raw = JSONObject(decrypt(cursor.getBlob(1)))
                val source = raw.optLong("source_message_at", 0)
                items.add(Pair(cursor.getString(0), JSONObject()
                    .put("event_id", cursor.getString(0))
                    .put("captured_at", java.time.Instant.ofEpochMilli(cursor.getLong(2)).toString())
                    .put("source_message_at", if (source > 0) java.time.Instant.ofEpochMilli(source).toString() else JSONObject.NULL)
                    .put("text", raw.getString("text"))))
            }
            items
        }
    }
    fun acknowledge(ids: List<String>) = access {
        val db = writableDatabase
        db.beginTransaction()
        try { ids.forEach { db.delete("events", "id=?", arrayOf(it)) }; db.setTransactionSuccessful() }
        finally { db.endTransaction() }
    }
    fun wipe() = access { writableDatabase.delete("events", null, null); Unit }

    companion object {
        private val lock = Any()
        private val live = mutableSetOf<Queue>()
        /** Explicit owner action; interrupted reset stays blocked by a durable marker. */
        fun resetAfterOwnerConfirmation(context: Context) = synchronized(lock) {
            val app = context.applicationContext
            val repair = app.getSharedPreferences("queue-repair", 0)
            check(repair.edit().putBoolean("pending", true).commit())
            check(app.getSharedPreferences("capture", 0).edit().putBoolean("enabled", false).commit())
            live.toList().forEach { it.close() }
            check(app.getSharedPreferences("private-pairing", 0).edit().clear().commit())
            app.deleteDatabase("capture.db")
            val path = app.getDatabasePath("capture.db").absolutePath
            if (listOf("", "-wal", "-shm", "-journal").any { java.io.File(path + it).exists() })
                throw QueueUnavailable("QUEUE_RESET_FAILED")
            AndroidQueueKeys().deleteAll()
            check(app.getSharedPreferences("health", 0).edit().putBoolean("owner_reset", true).commit())
            check(repair.edit().putBoolean("pending", false).commit())
        }
    }
}
