# Actual local outputs

Base c4497da. Synthetic tests only; no device/account/provider/push delivery.

Latest E2E: 14 pass / 1 layout failure; isolated retry passes. Earlier complete run: 15 pass. The resize check remains flaky and unresolved. Do not substitute the earlier pass for the later failure.

- [check.txt](check.txt)
- [e2e-latest.txt](e2e-latest.txt)
- [e2e-passing-run.txt](e2e-passing-run.txt)
- [gradle.txt](gradle.txt)
- [kit-isolated-retry.txt](kit-isolated-retry.txt)
- [lint.txt](lint.txt)
- [mutations.txt](mutations.txt)
- [npm-ci.txt](npm-ci.txt)
- [pwa.txt](pwa.txt)
- [python.txt](python.txt)

- [planning.txt](planning.txt)
- [placeholders.txt](placeholders.txt)
- [diff.txt](diff.txt)

## Fault proofs

Sixteen declared faults, with baseline/broken/restored output for each (48 files).

- [budget-cap-baseline.txt](mutations/budget-cap-baseline.txt)
- [budget-cap-broken.txt](mutations/budget-cap-broken.txt)
- [budget-cap-restored.txt](mutations/budget-cap-restored.txt)
- [calendar-range-baseline.txt](mutations/calendar-range-baseline.txt)
- [calendar-range-broken.txt](mutations/calendar-range-broken.txt)
- [calendar-range-restored.txt](mutations/calendar-range-restored.txt)
- [click-origin-baseline.txt](mutations/click-origin-baseline.txt)
- [click-origin-broken.txt](mutations/click-origin-broken.txt)
- [click-origin-restored.txt](mutations/click-origin-restored.txt)
- [cron-failure-baseline.txt](mutations/cron-failure-baseline.txt)
- [cron-failure-broken.txt](mutations/cron-failure-broken.txt)
- [cron-failure-restored.txt](mutations/cron-failure-restored.txt)
- [cursor-scope-baseline.txt](mutations/cursor-scope-baseline.txt)
- [cursor-scope-broken.txt](mutations/cursor-scope-broken.txt)
- [cursor-scope-restored.txt](mutations/cursor-scope-restored.txt)
- [daily-health-count-baseline.txt](mutations/daily-health-count-baseline.txt)
- [daily-health-count-broken.txt](mutations/daily-health-count-broken.txt)
- [daily-health-count-restored.txt](mutations/daily-health-count-restored.txt)
- [generator-mode-baseline.txt](mutations/generator-mode-baseline.txt)
- [generator-mode-broken.txt](mutations/generator-mode-broken.txt)
- [generator-mode-restored.txt](mutations/generator-mode-restored.txt)
- [generator-repository-baseline.txt](mutations/generator-repository-baseline.txt)
- [generator-repository-broken.txt](mutations/generator-repository-broken.txt)
- [generator-repository-restored.txt](mutations/generator-repository-restored.txt)
- [generic-alert-baseline.txt](mutations/generic-alert-baseline.txt)
- [generic-alert-broken.txt](mutations/generic-alert-broken.txt)
- [generic-alert-restored.txt](mutations/generic-alert-restored.txt)
- [health-unknown-baseline.txt](mutations/health-unknown-baseline.txt)
- [health-unknown-broken.txt](mutations/health-unknown-broken.txt)
- [health-unknown-restored.txt](mutations/health-unknown-restored.txt)
- [history-end-baseline.txt](mutations/history-end-baseline.txt)
- [history-end-broken.txt](mutations/history-end-broken.txt)
- [history-end-restored.txt](mutations/history-end-restored.txt)
- [push-body-baseline.txt](mutations/push-body-baseline.txt)
- [push-body-broken.txt](mutations/push-body-broken.txt)
- [push-body-restored.txt](mutations/push-body-restored.txt)
- [push-endpoint-baseline.txt](mutations/push-endpoint-baseline.txt)
- [push-endpoint-broken.txt](mutations/push-endpoint-broken.txt)
- [push-endpoint-restored.txt](mutations/push-endpoint-restored.txt)
- [push-expiry-baseline.txt](mutations/push-expiry-baseline.txt)
- [push-expiry-broken.txt](mutations/push-expiry-broken.txt)
- [push-expiry-restored.txt](mutations/push-expiry-restored.txt)
- [push-unknown-baseline.txt](mutations/push-unknown-baseline.txt)
- [push-unknown-broken.txt](mutations/push-unknown-broken.txt)
- [push-unknown-restored.txt](mutations/push-unknown-restored.txt)
- [search-page-baseline.txt](mutations/search-page-baseline.txt)
- [search-page-broken.txt](mutations/search-page-broken.txt)
- [search-page-restored.txt](mutations/search-page-restored.txt)

## Development failures and excluded experiment

The extra browser epoch guard survived removal because refresh already unmounts its component. It was removed; that experiment is not a killed fault or a shipped fault-runner case. Initial copied-schema and shared test-window failures are also excluded from fault totals.

- [browser-e2e-second.txt](development/browser-e2e-second.txt)
- [budget-e2e-first.txt](development/budget-e2e-first.txt)
- [mutation-fixture-schema-error.txt](development/mutation-fixture-schema-error.txt)
- [shared-budget-vitest.txt](development/shared-budget-vitest.txt)
- [unnecessary-guard-survived.txt](development/unnecessary-guard-survived.txt)
