"""Native policy/API28 and focused real Worker credential tests.
NOT RUN in builder workspace. Ceilings are policy, not measured duration.
"""
from mutation_harness import Case, run_suite

BUDGET_SECONDS = 1500
CASES = [
    Case('native-inherited-autocloseable', 'apps/android-companion/app/src/main/java/id/academicos/companion/ledger/PrivateStore.kt', 'null,1),AutoCloseable {', 'null,1) {', 'gradle', 'verifyApi28', '', 'receiver type mismatch'),
    Case('native-newer-android', 'apps/android-companion/app/src/main/java/id/academicos/companion/ledger/Ui.kt', 'class Ui(val activity:Activity) {', 'class Ui(val activity:Activity) {\n private fun regression() = activity.display', 'gradle', 'verifyApi28', '', "unresolved reference 'display'"),
    Case('native-host-jdk', 'apps/android-companion/app/src/main/java/id/academicos/companion/ledger/Ui.kt', 'class Ui(val activity:Activity) {', 'class Ui(val activity:Activity) {\n private fun regression() = java.nio.file.Files.mismatch(java.nio.file.Paths.get("a"),java.nio.file.Paths.get("b"))', 'gradle', 'verifyApi28', '', "unresolved reference 'mismatch'"),
    Case('native-precision-collapse', 'apps/android-companion/app/src/main/java/id/academicos/companion/ledger/NativePolicy.kt', '"unknown","approximate"->require(date==null&&wall==null&&zone==null)', '"unknown","approximate"->Unit', 'gradle', 'testNativePolicy', '', 'Check failed'),
    Case('native-undated-done', 'apps/android-companion/app/src/main/java/id/academicos/companion/ledger/NativePolicy.kt', 'if(precision=="unknown"||precision=="approximate")return "undated"', 'if(precision=="unknown"||precision=="approximate")return if(status=="done")"done"else"undated"', 'gradle', 'testNativePolicy', '', 'Check failed'),
    Case('native-discard-uncertain-request', 'apps/android-companion/app/src/main/java/id/academicos/companion/ledger/NativePolicy.kt', 'status !in 400..499 || status in listOf(408,425,429)', 'status in 200..299', 'gradle', 'testNativePolicy', '', 'Check failed'),
    Case('native-unavailable-is-empty', 'apps/android-companion/app/src/main/java/id/academicos/companion/ledger/NativePolicy.kt', 'failed->LoadState.UNAVAILABLE', 'failed->LoadState.EMPTY', 'gradle', 'testNativePolicy', '', 'Check failed'),
    Case('device-pending-authority', 'apps/worker/src/device-auth.ts', "(!pending && client.status !== 'active')", 'false', 'vitest', 'tests/integration/native-owner.test.ts', 'pending has no task authority', 'AssertionError'),
    Case('device-scope-bypass', 'apps/worker/src/device-auth.ts', '  return routes.some(', '  return true || routes.some(', 'vitest', 'tests/integration/native-owner.test.ts', 'device scope never includes', 'AssertionError'),
    Case('snooze-expired-receipt', 'apps/worker/src/index.ts', "            scope = 'snooze:' + snooze[1];", "            scope = 'snooze:' + snooze[1];\n          if (Date.parse(v.until) <= Date.now()) throw new Http(422, 'INVALID_SNOOZE');", 'vitest', 'tests/integration/native-owner.test.ts', 'snooze lost-response retry', 'AssertionError'),
]

if __name__ == "__main__":
    run_suite('native', CASES, BUDGET_SECONDS)
