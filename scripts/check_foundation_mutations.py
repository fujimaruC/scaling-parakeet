"""Focused design foundation assertions in private copies.
NOT RUN in builder workspace. Ceilings are policy, not measured duration.
"""
from mutation_harness import Case, run_suite

BUDGET_SECONDS = 900
CASES = [
    Case('imprecise-urgency', 'apps/web/src/pixel/UrgencyBar.tsx', "precision !== 'datetime' ||", '', 'vitest', 'tests/foundation.test.ts', 'urgency respects boundaries', ''),
    Case('frozen-system-theme', 'apps/web/src/design/theme.ts', "media.addEventListener('change', apply);", '', 'browser', 'tests/e2e/foundation.spec.ts', 'fonts stay local', ''),
    Case('missing-local-fonts', 'apps/web/src/design/tokens.css', "src: url('/fonts/pixelifysans.woff') format('woff');", "src: url('/fonts/missing.woff') format('woff');", 'browser', 'tests/e2e/foundation.spec.ts', 'fonts stay local', ''),
    Case('hidden-secondary-routes', 'apps/web/src/main.tsx', '{nav.map((p) => (', '{nav.slice(0, 4).map((p) => (', 'browser', 'tests/e2e/foundation.spec.ts', 'secondary workflows', ''),
]

if __name__ == "__main__":
    run_suite('foundation', CASES, BUDGET_SECONDS)
