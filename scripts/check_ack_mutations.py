"""Focused cloud acknowledgment + local receipt/generation proofs.
NOT RUN in builder workspace. Ceilings are policy, not measured duration.
"""
from mutation_harness import Case, run_suite

BUDGET_SECONDS = 600
CASES = [
    Case('cloud-assumed-success', 'apps/worker/src/device-actions.ts', "progress: row.applied_at\n      ? 'applied'", "progress: true\n      ? 'applied'", 'vitest', 'tests/integration/ledger.test.ts', 'device actions require explicit attestations', ''),
    Case('local-assumed-applied', 'collectors/local/src/academic_os/pairing.py', "if phase=='applied':self.store.db.execute", 'if True:self.store.db.execute', 'python', 'test_control.py', 'test_offline_retry_generations_and_phase_journal', ''),
    Case('evidence-fabricated-pass', 'scripts/device_evidence.py', "'smoke_result':'unverified'", "'smoke_result':'PASS'", 'python', 'test_control.py', 'test_evidence_projection_never_passes_unrun_cases_or_private_extras', ''),
    Case('stale-generation', 'apps/worker/src/device-actions.ts', 'o.generation !== source.generation', 'false', 'vitest', 'tests/integration/ledger.test.ts', 'device actions require explicit attestations', ''),
    Case('receipt-without-commit', 'collectors/local/src/academic_os/pairing.py', '  self.receipt(device,batch)', '  pass # MUTATION: accept nonexistent receipt', 'python', 'test_control.py', 'test_receipt_ack_requires_real_commit_and_survives_restart', ''),
    Case('no-job-purge', 'collectors/local/src/academic_os/control.py', '   store.purge(source)', '   pass # MUTATION: omit local purge', 'python', 'test_control.py', 'test_no_job_poll_wipes_locally_even_if_relay_response_is_lost', ''),
]

if __name__ == "__main__":
    run_suite('ack', CASES, BUDGET_SECONDS)
