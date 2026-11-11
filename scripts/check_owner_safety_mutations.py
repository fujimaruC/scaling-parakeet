"""Synthetic signing/evidence safeguards, never a device.
NOT RUN in builder workspace. Ceilings are policy, not measured duration.
"""
from mutation_harness import Case, run_suite

BUDGET_SECONDS = 600
CASES = [
    Case('marker-substring', 'scripts/device_evidence.py', "marker=re.fullmatch(r'I/AOS-RUN\\s*\\(\\s*\\d+\\):\\s*'+re.escape(self.token)+r' (START|END)\\s*',line)", "marker=re.search(re.escape(self.token)+r' (START|END)',line)", 'python', 'test_owner_safety.py', 'test_marker_looking_message_cannot_open_a_window', ''),
    Case('pid-reuse', 'scripts/device_evidence.py', 'if len(names)>1:self.bad=True;self.target.discard(pid)', 'if False:self.bad=True;self.target.discard(pid)', 'python', 'test_owner_safety.py', 'test_pid_reuse_cannot_attribute_another_process_crash_to_this_app', ''),
    Case('signing-bypass', 'scripts/device_evidence.py', "if safety['allowed'] is not True:", 'if False:', 'python', 'test_owner_safety.py', 'test_install_never_runs_when_signing_is_unknown_or_incompatible', ''),
    Case('retained-data-as-fresh', 'scripts/apk_safety.py', ' paths=text.strip().splitlines()', " if rows and not text.strip():result['allowed']=True;return result\n paths=text.strip().splitlines()", 'python', 'test_owner_safety.py', 'test_retained_package_data_is_not_treated_as_first_install', ''),
    Case('skipped-case-claimed', 'scripts/owner_device_run.py', "'owner_reported_ok':None", "'owner_reported_ok':True", 'python', 'test_owner_safety.py', 'test_skipped_case_never_runs_or_claims_success', ''),
    Case('missing-marker-case', 'scripts/owner_device_run.py', "if not window.started.is_set():raise Blocked('START_MARKER_UNAVAILABLE')", "if False:raise Blocked('START_MARKER_UNAVAILABLE')", 'python', 'test_owner_safety.py', 'test_missing_marker_does_not_prompt_for_or_certify_a_case', ''),
    Case('unverified-readback-launch', 'scripts/device_evidence.py', "if apk is not None and safe['install_ok'] is not True:", 'if False:', 'python', 'test_owner_safety.py', 'test_unconfirmed_install_readback_cannot_launch_the_old_app', ''),
]

if __name__ == "__main__":
    run_suite('owner_safety', CASES, BUDGET_SECONDS)
