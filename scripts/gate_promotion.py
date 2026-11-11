"""Pure document transformation. Calling this module never executes a proof."""
from pathlib import Path

PROMOTIONS = {
    'disposable-d1-local': ('8', 'vitest:tests/integration/d1-restore.test.ts::disposable D1 restores all canonical tables with parity and future-only rebuilds', 'Disposable D1 canonical restore execution remains unverified.', 'Disposable D1 canonical restore is locally verified; production D1 restore and revoked-source reconciliation remain unverified.'),
    'synthetic-router-local': ('3', 'test_router_pipeline.RouterPipelineTests.test_consent_retry_projection_queue_and_real_sync_commit', 'Synthetic router end-to-end execution remains unverified.', 'Synthetic loopback router end-to-end execution is locally verified; real provider/route behavior remains unverified.'),
}

def proposed_documents(root):
    status_path = Path('docs/STATUS.md')
    strategy_path = Path('docs/11-TEST-STRATEGY.md')
    status = (root / status_path).read_text()
    strategy = (root / strategy_path).read_text()
    for key, (number, test, old, sentence) in PROMOTIONS.items():
        before = '| ' + key + ' | ' + number + ' | none | unverified | ' + old + ' |'
        after = '| ' + key + ' | ' + number + ' | ' + test + ' | locally_verified | ' + sentence + ' |'
        if after in strategy and sentence in status and old not in status:
            continue
        if before not in strategy:
            raise ValueError('PROMOTION_PRECONDITION ' + key)
        if status.count(old) != 1:
            raise ValueError('PROMOTION_STATUS_PRECONDITION ' + key)
        strategy = strategy.replace(before, after, 1)
        status = status.replace(old, sentence, 1)
    return {status_path: status, strategy_path: strategy}

def stage_promoted_claims(root):
    for name, text in proposed_documents(root).items():
        (root / name).write_text(text)
