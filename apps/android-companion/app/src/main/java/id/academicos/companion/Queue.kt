package id.academicos.companion
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import java.security.MessageDigest
import java.util.UUID

class Queue(private val context: Context): SQLiteOpenHelper(context,"capture.db",null,1) {
 override fun onCreate(db: SQLiteDatabase) { db.execSQL("CREATE TABLE events(id TEXT PRIMARY KEY,fingerprint TEXT UNIQUE,payload BLOB NOT NULL,created INTEGER NOT NULL)") }
 override fun onUpgrade(db: SQLiteDatabase, old: Int, next: Int) { error("Migration required") }
 private fun key(): SecretKey {
  val store=KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
  (store.getKey("academic-queue",null) as? SecretKey)?.let { return it }
  // Never silently replace a lost key while ciphertext remains.
  if(count()>0) error("Queue key unavailable; owner wipe required")
  val generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore")
  generator.init(KeyGenParameterSpec.Builder("academic-queue",KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
  return generator.generateKey()
 }
 fun count(): Int = readableDatabase.rawQuery("SELECT count(*) FROM events",null).use { it.moveToFirst(); it.getInt(0) }
 fun add(payload: String) {
  val db=writableDatabase; val prefs=context.getSharedPreferences("health",0)
  val expire=System.currentTimeMillis()-14L*86400000
  val removed=db.delete("events","created < ?",arrayOf(expire.toString()))
  if(removed>0) prefs.edit().putInt("gaps",prefs.getInt("gaps",0)+removed).apply()
  val size=db.rawQuery("SELECT coalesce(sum(length(payload)),0) FROM events",null).use { it.moveToFirst();it.getLong(0) }
  if(size+payload.toByteArray().size>50L*1024*1024) { prefs.edit().putInt("gaps",prefs.getInt("gaps",0)+1).apply();return }
  val fingerprint=Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(payload.toByteArray()),Base64.NO_WRAP)
  val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key())
  val encrypted=cipher.iv+cipher.doFinal(payload.toByteArray())
  val values=android.content.ContentValues().apply {put("id",UUID.randomUUID().toString());put("fingerprint",fingerprint);put("payload",encrypted);put("created",System.currentTimeMillis())}
  db.insertWithOnConflict("events",null,values,SQLiteDatabase.CONFLICT_IGNORE)
 }
 fun wipe(){writableDatabase.delete("events",null,null)}
}
