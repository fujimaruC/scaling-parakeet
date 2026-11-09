# Resource budgets: observations and proposals

Base af1879bfb561774e6eca20a6f9d4c7cffa0ae83b; builder working tree.
No account, provider, deployment or device was used. These are application
measurements/guardrails, **not billing or account quota enforcement**. T33 remains
partial until real CPU/row usage and owner review exist.

## Method and reproduction

```sh
npm ci
npm run build
node --import tsx scripts/measure_resources.ts /absolute/outside/repo/resources.json
```

The script inventories the actual production `apps/web/dist` and dry-run Worker
`apps/worker/dist/index.js`, compressing each file with Node zlib gzip level9.
It uses disposable Miniflare/D1, all8 migrations, and synthetic100/1,200-task
profiles. Each seeded task generates an audit event. Owner identity is injected
only in this non-deployed script; production JWT cost is not measured. The real
shared routes and durable accounting execute. Warm one request, measure five
complete response reads; export runs once per profile to respect its budget.
Wall time includes Node/Miniflare IPC, D1, serialization and response consumption.
Five samples support observed median/max, **not a credible production p95**.
EXPLAIN QUERY PLAN runs against the SQL captured from those actual handlers.
Candidate tables are empty in this task-ledger profile; candidate fanout is not
benchmarked. No private account, chat input, outbound push or AI is involved.

Captured 2026-11-09T14:10:51.965000+08:00; Node v24.22.1. Machine load and runtime versions can change timings/gzip output.
Exact per-file bytes, SQL and every sample: [RESOURCE-MEASUREMENTS.json](RESOURCE-MEASUREMENTS.json).

## Production artifact bytes

| Artifact | Raw bytes | gzip bytes (level9) |
|---|---:|---:|
| Application JS (excludes service worker) | 309,154 | 98,262 |
| CSS | 23,180 | 5,804 |
| Fonts | 487,948 | 485,604 |
| All public build bytes | 838,061 | 597,993 |
| Worker dry-run bundle (server) | 497,776 | 99,629 |

The 200 KiB gzip initial-JS target in the test strategy applies to application
JS, not fonts or the server bundle. This inventory includes all emitted app JS;
there are no assumed deferred-route savings. File gzip is not measured network
transfer compression. Fonts remain self-hosted. No mobile startup claim follows.

## Observed local route profiles

| Tasks | Route | Samples | Median ms | Max ms | Response bytes | Prepared statements/request |
|---:|---|---:|---:|---:|---:|---:|
| 100 | Task page | 5 | 59.234 | 143.024 | 43,120 | 3 |
| 100 | Title search | 5 | 62.557 | 78.785 | 560 | 3 |
| 100 | Calendar month | 5 | 49.164 | 60.831 | 3,571 | 3 |
| 100 | Global history first page | 5 | 50.298 | 120.227 | 15,502 | 3 |
| 100 | Global history cursor | 5 | 59.508 | 126.282 | 15,502 | 3 |
| 100 | Task detail/scoped history | 5 | 312.198 | 522.398 | 1,053 | 6 |
| 100 | Candidate page (empty) | 5 | 74.050 | 130.007 | 132 | 3 |
| 100 | Full CSV snapshot | 1 | 200.010 | 200.010 | 95,073 | 24 |
| 1200 | Task page | 5 | 59.919 | 60.616 | 43,383 | 3 |
| 1200 | Title search | 5 | 46.880 | 56.689 | 989 | 3 |
| 1200 | Calendar month | 5 | 59.037 | 78.344 | 43,237 | 3 |
| 1200 | Global history first page | 5 | 43.573 | 50.123 | 15,702 | 3 |
| 1200 | Global history cursor | 5 | 45.358 | 48.832 | 15,705 | 3 |
| 1200 | Task detail/scoped history | 5 | 62.572 | 84.927 | 1,053 | 6 |
| 1200 | Candidate page (empty) | 5 | 46.477 | 47.376 | 132 | 3 |
| 1200 | Full CSV snapshot | 1 | 289.121 | 289.121 | 1,124,168 | 24 |

Statement counts include the two persistent accounting increments. Detail has
four transactional read projections after accounting. Export has eleven schema
queries and eleven transactional data reads after accounting. It reads the full
canonical snapshot; pagination limits do **not** bound export memory/rows.

## Query shapes and consequences

| View | Captured local plan | Consequence |
|---|---|---|
| Task list / title search / month calendar | `SCAN tasks USING INDEX tasks_local_date`; `USE TEMP B-TREE FOR ORDER BY` | Limit100 bounds returned rows, not scanned rows or sorting. Leading-wildcard LIKE and computed order/date predicates still need real usage review. Do not call this an indexed seek. |
| Global history first page | `SCAN task_events` in rowid order with limit/lookahead | Ordered first page is bounded in result size; later paging must use the cursor. |
| Global history cursor | `SEARCH task_events USING INTEGER PRIMARY KEY (rowid<?)` | Descending immutable ID continuation; no offset growth. |
| Scoped task history | `SEARCH task_events USING INDEX task_events_task_cursor (task_id=?)` | Uses its task/event index and30+lookahead, independent of global last100. |
| Candidates | `candidates_review_cursor` plus source/evidence index lookups and temp ordering | Only the empty-candidate case is timed here; populated evidence fanout is unmeasured. |
| Canonical export | Full scans in deterministic primary-key order | All11 allowlisted tables, whole snapshot. CSV quoting is not a query/memory bound. |

These are Miniflare SQLite plan observations, not production D1 row billing.
Task scans are a remaining scaling risk. Measure populated10,000-task/evidence
profiles and account rows before considering FTS/materialized sort keys; no index
rewrite or undocumented higher limit is introduced by this measurement slice.

## Existing enforced limits and proposed review ceilings

All minute limits below already exist in operations.ts, with a shared10,000
requests/UTC-day cap. They count admitted application attempts and refusals across
isolate restarts, not static assets, auth failures, account CPU/rows or other
projects. Two counting writes themselves cost D1 work; a cap is not zero billing.

| Class | Enforced requests/min | Existing size/result bound | Proposed review ceiling (not newly enforced) |
|---|---:|---|---|
| read | 600 | Pages1–100; scoped history30+lookahead | ≤256 KiB structured response; warmed local read max≤1,000 ms in the documented profile |
| write | 120 | JSON body≤256 KiB, field validation/CAS | Keep120/min; review each multi-statement path against actual account CPU before release |
| sync | 60 | ≤256 KiB /100 items /50 candidates | Keep60/min and current body/count bounds; no retry-storm increase |
| enroll | 10 | Body≤4 KiB plus existing grant/attempt limits | Keep10/min; no automatic widening on failed enrollment |
| export | 4 | Full11-table snapshot; no total-byte cap | Review/chunking design at8 MiB raw output; never silently truncate a backup |

The measurement controller's ending RSS sample was 420,970,496
bytes. It excludes the separate workerd process, browsers and Gradle. It is not
peak RSS, a Linux parser measurement or an Android memory profile. Proposed
review threshold for this controller sample:512 MiB (headroom above the observed sample; peak remains unmeasured); the existing parser peak
RSS target256 MiB remains independently unmeasured. No process-memory guard was
added. A result above a proposal triggers investigation, not a falsified pass or
an automatic budget increase.

## Explicitly unmeasured / still gated

- Real Worker CPU: **unmeasured** (`worker_cpu_ms=null`). Local wall time cannot
  supply it. Set a per-class CPU ceiling only after measuring and checking the
  actual owner's plan; no platform allowance is invented here.
- Production D1 rows read/written and storage: **unmeasured** (both null). Query
  plans/statement counts are not billing counts.
- Mobile first useful view, Android callback/persistence timing and whole-device
  memory: **unmeasured**. Keep the existing3s/<50ms proposals as targets only.
- Linux20,000-message parser peak RSS: **unmeasured** in this slice.
- Owner budget review, account limits, paid-service choice and pilot: **unverified**.

No milestone is complete. Proposed ceilings are engineering review thresholds,
not an owner spending decision, an SLA, or authorization to provision anything.
