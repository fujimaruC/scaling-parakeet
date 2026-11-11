"""Round6 highest-value faults plus real Gate3/Gate8 proof-path negatives.
NOT RUN in the builder workspace. All mutation happens in private copies.
"""
from mutation_harness import Case, run_suite
from gate_promotion import stage_promoted_claims

BUDGET_SECONDS = 1800
CASES = [
    Case('export-eleven-table-parity', 'apps/worker/src/export.ts', '? [...tables]', "? tables.filter((t) => t !== 'task_evidence')", 'vitest', 'tests/integration/export-contract.test.ts', 'CSV and JSON export exactly the same eleven tables'),
    Case('export-compound-select-regression', 'apps/worker/src/export.ts', '        \'SELECT (\' +\n          selected\n            .map((t) => \'(SELECT count(*) FROM "\' + t + \'")\')\n            .join(\' + \') +\n          \') AS total\',\n', '        selected.map((t) => \'SELECT count(*) AS total FROM "\' + t + \'"\').join(\' UNION ALL \'),\n', 'vitest', 'tests/integration/export-contract.test.ts', 'CSV and JSON export exactly the same eleven tables'),
    Case('export-row-ceiling', 'apps/worker/src/export.ts', 'total > max', 'false', 'vitest', 'tests/integration/export-selection.test.ts', 'row ceilings return a clean JSON 413'),
    Case('export-duplicate-selector', 'apps/worker/src/index.ts', "if (url.searchParams.getAll('table').length > 1)", 'if (false)', 'vitest', 'tests/integration/export-selection.test.ts', 'every canonical table can be selected'),
    Case('restore-excluded-credential', 'packages/contracts/canonical-tables.json', '"task_evidence"]', '"task_evidence","collector_credentials"]', 'vitest', 'tests/integration/d1-restore.test.ts', 'disposable D1 restores all canonical tables'),
    Case('restore-digest-parity', 'scripts/lib/d1-restore.ts', ".digest('hex');", ".digest('hex').replace(/./g, '0');", 'vitest', 'tests/integration/d1-restore.test.ts', 'disposable D1 restores all canonical tables'),
    Case('review-no-canonical-without-approval', 'apps/worker/src/index.ts', '  await env.DB.batch(statements);', '  await env.DB.batch(statements);\n  await env.DB.prepare("INSERT INTO tasks(id,title,kind,status,priority,due_json,created_at,updated_at) VALUES(?,\'Synthetic unapproved mutation\',\'personal_action\',\'todo\',\'normal\',?,?,?)").bind(uuid(),JSON.stringify(unknownDue),now(),now()).run();', 'vitest', 'tests/integration/review-boundary.test.ts', 'AI-shaped proposals'),
    Case('itk-explicit-projection-review', 'collectors/local/src/academic_os/itk_operations.py', "if value.get('confirmed')!='yes':raise Invalid('PROJECTION_REVIEW_REQUIRED')", "if False:raise Invalid('PROJECTION_REVIEW_REQUIRED')", 'python', 'test_itk.py', 'test_full_local_preview_stages_review_without_cloud_or_provider'),
    Case('router-no-implicit-queue', 'collectors/local/src/academic_os/pipeline.py', "self.save(ident,source,'awaiting_projection_review'", "self.save(ident,source,'sync_pending'", 'python', 'test_router_pipeline.py', 'test_consent_retry_projection_queue_and_real_sync_commit'),
    Case('gate8-wrong-proof', 'docs/11-TEST-STRATEGY.md', '| vitest:tests/integration/d1-restore.test.ts::disposable D1 restores all canonical tables with parity and future-only rebuilds | locally_verified', '| test_core.NotTheRequiredProof | locally_verified', 'gate', '', '', 'GATE_EVIDENCE_SCOPE disposable-d1-local'),
    Case('gate8-missing-sentence', 'docs/STATUS.md', 'Disposable D1 canonical restore is locally verified; production D1 restore and revoked-source reconciliation remain unverified.', 'Promotion evidence sentence removed.', 'gate', '', '', 'GATE_CLAIM_DRIFT disposable-d1-local'),
    Case('gate8-stale-contradiction', 'docs/STATUS.md', 'Disposable D1 canonical restore is locally verified; production D1 restore and revoked-source reconciliation remain unverified.', 'Disposable D1 canonical restore is locally verified; production D1 restore and revoked-source reconciliation remain unverified. Disposable D1 canonical restore execution remains unverified.', 'gate', '', '', 'GATE_CLAIM_CONTRADICTION disposable-d1-local'),
    Case('gate3-wrong-proof', 'docs/11-TEST-STRATEGY.md', '| test_router_pipeline.RouterPipelineTests.test_consent_retry_projection_queue_and_real_sync_commit | locally_verified', '| test_core.NotTheRequiredProof | locally_verified', 'gate', '', '', 'GATE_EVIDENCE_SCOPE synthetic-router-local'),
    Case('gate3-missing-sentence', 'docs/STATUS.md', 'Synthetic loopback router end-to-end execution is locally verified; real provider/route behavior remains unverified.', 'Promotion evidence sentence removed.', 'gate', '', '', 'GATE_CLAIM_DRIFT synthetic-router-local'),
    Case('gate3-stale-contradiction', 'docs/STATUS.md', 'Synthetic loopback router end-to-end execution is locally verified; real provider/route behavior remains unverified.', 'Synthetic loopback router end-to-end execution is locally verified; real provider/route behavior remains unverified. Synthetic router end-to-end execution remains unverified.', 'gate', '', '', 'GATE_CLAIM_CONTRADICTION synthetic-router-local'),
]

if __name__ == "__main__":
    run_suite("round6", CASES, BUDGET_SECONDS, prepare=stage_promoted_claims)
