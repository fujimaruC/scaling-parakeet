"""Queue privacy + full API28 compiler surface, never hardware.
NOT RUN in builder workspace. Ceilings are policy, not measured duration.
"""
from mutation_harness import Case, run_suite

BUDGET_SECONDS = 1200
CASES = [
    Case('unkeyed-fingerprint', 'apps/android-companion/app/src/main/java/id/academicos/companion/QueuePrivacy.kt', 'return mac.doFinal(payload.toByteArray(Charsets.UTF_8))', 'return java.security.MessageDigest.getInstance("SHA-256").digest(payload.toByteArray(Charsets.UTF_8))', 'gradle', 'testQueuePrivacy', '', 'java.lang.IllegalStateException: Check failed.'),
    Case('missing-key-regeneration', 'apps/android-companion/app/src/main/java/id/academicos/companion/QueuePrivacy.kt', 'if (protectedData) throw QueueUnavailable("KEY_MISSING_WIPE_REQUIRED")', '// MUTATION: allow regeneration over protected data', 'gradle', 'testQueuePrivacy', '', 'Expected KEY_MISSING_WIPE_REQUIRED'),
    Case('legacy-migration-bypass', 'apps/android-companion/app/src/main/java/id/academicos/companion/QueuePrivacy.kt', 'if (oldVersion < 2) throw QueueUnavailable("LEGACY_QUEUE_WIPE_REQUIRED")', '// MUTATION: bypass legacy gate', 'gradle', 'testQueuePrivacy', '', 'Expected LEGACY_QUEUE_WIPE_REQUIRED'),
    Case('inherited-autocloseable', 'apps/android-companion/app/src/main/java/id/academicos/companion/Queue.kt', 'null, 2), AutoCloseable {', 'null, 2) {', 'gradle', 'verifyApi28', '', 'receiver type mismatch'),
    Case('newer-android-method', 'apps/android-companion/app/src/main/java/id/academicos/companion/Queue.kt', 'private val app = context.applicationContext', 'private val app = context.applicationContext\n    private fun api30Regression() = app.display', 'gradle', 'verifyApi28', '', "unresolved reference 'display'"),
    Case('host-jdk-method', 'apps/android-companion/app/src/main/java/id/academicos/companion/Queue.kt', 'private val app = context.applicationContext', 'private val app = context.applicationContext\n    private fun newerJavaRegression() = java.nio.file.Files.mismatch(java.nio.file.Paths.get("a"), java.nio.file.Paths.get("b"))', 'gradle', 'verifyApi28', '', "unresolved reference 'mismatch'"),
]

if __name__ == "__main__":
    run_suite('android', CASES, BUDGET_SECONDS)
