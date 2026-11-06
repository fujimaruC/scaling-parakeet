package id.academicos.companion

import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/** Plain-JVM main executed by Gradle; no JUnit dependency or Android mocks. */
object QueuePrivacyTest {
    private class Vault : QueueKeyStore {
        val keys = mutableMapOf<QueueKey, SecretKey>()
        var generated = 0
        override fun load(kind: QueueKey) = keys[kind]
        override fun generate(kind: QueueKey): SecretKey {
            generated++
            val key = SecretKeySpec(ByteArray(32).also { java.security.SecureRandom().nextBytes(it) }, if (kind == QueueKey.ENCRYPTION) "AES" else "HmacSHA256")
            keys[kind] = key
            return key
        }
    }
    private fun reject(code: String, run: () -> Unit) {
        try { run() } catch (e: QueueUnavailable) { check(e.code == code); return }
        error("Expected $code; operation unexpectedly succeeded")
    }
    @JvmStatic fun main(args: Array<String>) {
        var passed = 0
        fun test(name: String, run: () -> Unit) { run(); passed++; println("PASS $name") }
        test("fingerprint is deterministic only within the keyed installation") {
            val vault = Vault()
            val key = QueuePrivacy.deduplicationKey(vault, false)
            val message = "Synthetic queue event alpha"
            val actual = QueuePrivacy.fingerprint(message, key)
            check(actual.contentEquals(QueuePrivacy.fingerprint(message, key)))
            check(!actual.contentEquals(QueuePrivacy.fingerprint("Synthetic queue event beta", key)))
            check(!actual.contentEquals(MessageDigest.getInstance("SHA-256").digest(message.toByteArray())))
            check(!actual.contentEquals(QueuePrivacy.fingerprint(message, QueuePrivacy.deduplicationKey(Vault(), false))))
            check(vault.generated == 1)
        }
        test("missing AES key with queued OR pairing ciphertext never generates") {
            val vault = Vault()
            reject("KEY_MISSING_WIPE_REQUIRED") { QueuePrivacy.encryptionKey(vault, true) }
            check(vault.generated == 0 && vault.keys.isEmpty())
        }
        test("lost dedupe key with queued rows never generates") {
            val vault = Vault()
            vault.generate(QueueKey.ENCRYPTION)
            val before = vault.generated
            reject("KEY_MISSING_WIPE_REQUIRED") { QueuePrivacy.deduplicationKey(vault, true) }
            check(vault.generated == before && vault.keys[QueueKey.DEDUPLICATION] == null)
        }
        test("restart reuses keys and ciphertext; loss remains blocked") {
            val vault = Vault()
            val key = QueuePrivacy.encryptionKey(vault, false)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key) }
            val encrypted = cipher.doFinal("Synthetic restart payload".toByteArray())
            val iv = cipher.iv
            val loaded = QueuePrivacy.encryptionKey(vault, true)
            val reopened = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, loaded, GCMParameterSpec(128, iv)) }
            check(String(reopened.doFinal(encrypted)) == "Synthetic restart payload")
            vault.keys.remove(QueueKey.ENCRYPTION)
            val before = vault.generated
            reject("KEY_MISSING_WIPE_REQUIRED") { QueuePrivacy.encryptionKey(vault, true) }
            check(vault.generated == before)
        }
        test("legacy format requires explicit owner reset, even when empty") {
            reject("LEGACY_QUEUE_WIPE_REQUIRED") { QueuePrivacy.requireCurrentFormat(1) }
            QueuePrivacy.requireCurrentFormat(2)
        }
        println("Queue privacy policy: $passed tests passed (JVM only; Android Keystore/SQLite/device unverified)")
    }
}
