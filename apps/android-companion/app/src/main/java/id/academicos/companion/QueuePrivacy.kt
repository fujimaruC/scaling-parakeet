package id.academicos.companion

import javax.crypto.Mac
import javax.crypto.SecretKey

internal enum class QueueKey { ENCRYPTION, DEDUPLICATION }
internal interface QueueKeyStore {
    fun load(kind: QueueKey): SecretKey?
    fun generate(kind: QueueKey): SecretKey
}
internal class QueueUnavailable(val code: String) : IllegalStateException(code)

/** Pure policy; the Android adapter holds non-exportable keys. */
internal object QueuePrivacy {
    fun encryptionKey(store: QueueKeyStore, hasCiphertext: Boolean): SecretKey =
        existingOrCreate(store, QueueKey.ENCRYPTION, hasCiphertext)
    fun deduplicationKey(store: QueueKeyStore, hasQueuedRows: Boolean): SecretKey =
        existingOrCreate(store, QueueKey.DEDUPLICATION, hasQueuedRows)
    private fun existingOrCreate(store: QueueKeyStore, kind: QueueKey, protectedData: Boolean): SecretKey {
        store.load(kind)?.let { return it }
        if (protectedData) throw QueueUnavailable("KEY_MISSING_WIPE_REQUIRED")
        return store.generate(kind)
    }
    fun fingerprint(payload: String, key: SecretKey): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(key)
        mac.update("academic-os/queue/v2\u0000".toByteArray(Charsets.UTF_8))
        return mac.doFinal(payload.toByteArray(Charsets.UTF_8))
    }
    fun requireCurrentFormat(oldVersion: Int) {
        if (oldVersion < 2) throw QueueUnavailable("LEGACY_QUEUE_WIPE_REQUIRED")
    }
}
