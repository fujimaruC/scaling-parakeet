"""Synthetic crash-window/artifact evidence checks, never a device.
NOT RUN in builder workspace. Ceilings are policy, not measured duration.
"""
from mutation_harness import Case, run_suite

BUDGET_SECONDS = 600
CASES = [
    Case('issued-install', 'scripts/device_evidence.py', "if code==0 and any(line.strip()=='Success' for line in text.splitlines()):", 'if True:', 'python', 'test_device_evidence.py', 'test_install_success_is_not_issued_or_cached', ''),
    Case('historical-activity', 'scripts/device_evidence.py', 'return any(re.search(', 'return COMP in text or any(re.search(', 'python', 'test_device_evidence.py', 'test_activity_history_cannot_satisfy_resumed', ''),
    Case('truncated-crash', 'scripts/device_evidence.py', 'if self.native or self.fatal & self.target:return True', 'if False:return True', 'python', 'test_device_evidence.py', 'test_native_crash_and_incomplete_fatal_attribution', ''),
    Case('missing-crash-boundary', 'scripts/device_evidence.py', 'and self.ended.is_set() and not self.bad', 'and not self.bad', 'python', 'test_device_evidence.py', 'test_incomplete_or_ambiguous_stream_is_unknown', ''),
    Case('dirty-provenance', 'scripts/device_evidence.py', "manifest.get('source_dirty') is False", 'True', 'python', 'test_device_evidence.py', 'test_dirty_or_missing_provenance_is_unknown', ''),
    Case('case-without-run', 'scripts/capture_matrix.py', "if elapsed<=0 or after.get('fatal_exception_observed') is not False:", 'if False:', 'python', 'test_device_evidence.py', 'test_case_cannot_pass_without_real_permission_transition_and_complete_window', ''),
    Case('edited-journal', 'scripts/capture_matrix.py', 'not hmac.compare_digest(signature,hmac.new(key,canonical(row),hashlib.sha256).hexdigest())', 'False', 'python', 'test_device_evidence.py', 'test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning', ''),
    Case('replaced-installed-artifact', 'scripts/device_evidence.py', 'if before_digest and before_digest==after_digest:', 'if before_digest:', 'python', 'test_device_evidence.py', 'test_run_binds_cold_process_warm_resume_and_installed_identity', ''),
    Case('leftover-warm-process', 'scripts/device_evidence.py', 'cold_pid==pid_text', 'True', 'python', 'test_device_evidence.py', 'test_run_binds_cold_process_warm_resume_and_installed_identity', ''),
    Case('stale-boot', 'scripts/device_evidence.py', 'if not boot or boot_end_code!=0 or boot_end.strip()!=boot:', 'if not boot:', 'python', 'test_device_evidence.py', 'test_run_binds_cold_process_warm_resume_and_installed_identity', ''),
]

if __name__ == "__main__":
    run_suite('evidence', CASES, BUDGET_SECONDS)
