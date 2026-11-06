package id.academicos.companion

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

internal class AndroidQueueKeys : QueueKeyStore {
    private fun alias(kind: QueueKey) = when (kind) {
        QueueKey.ENCRYPTION -> "academic-queue"
        QueueKey.DEDUPLICATION -> "academic-queue-dedupe-v2"
    }
    private fun store() = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    override fun load(kind: QueueKey): SecretKey? = store().getKey(alias(kind), null) as? SecretKey
    override fun generate(kind: QueueKey): SecretKey {
        val aes = kind == QueueKey.ENCRYPTION
        val algorithm = if (aes) KeyProperties.KEY_ALGORITHM_AES else KeyProperties.KEY_ALGORITHM_HMAC_SHA256
        val purposes = if (aes) KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT else KeyProperties.PURPOSE_SIGN
        val spec = KeyGenParameterSpec.Builder(alias(kind), purposes).setKeySize(256)
        if (aes) spec.setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        else spec.setDigests(KeyProperties.DIGEST_SHA256)
        return KeyGenerator.getInstance(algorithm, "AndroidKeyStore").apply { init(spec.build()) }.generateKey()
    }
    fun deleteAll() {
        val store = store()
        QueueKey.values().forEach { store.deleteEntry(alias(it)) }
    }
}
