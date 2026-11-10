# Resource budgets: historical observations and pending streaming profile

Fresh clone base b79092bc80906e6c3d13816ac241ff405ae6da43, 2026-11-09.
Application guardrails, **not billing/account quota enforcement**. No owner
account, provider, deployment or device was used. No milestone is complete.

## Recovery-delivery scope — 2026-11-10

**The observations below belong to the base buffered implementation, not the
reconstructed streaming code. No new benchmark was run by owner instruction.**
RESOURCE-MEASUREMENTS.json retains the original historical samples and adds an
explicit NOT_RUN streaming profile with null observations. Do not use the old
bundle sizes/CSV timings/RSS as measurements of the new source.

Configured CSV bounds:256 rows/page,8 pages/transaction,2,048 materialised rows,
16KiB chunks. These are code settings, not observed peak memory. A small table
starts with one page. OFFSET still scans; triggers add canonical-write work.
The measurement script now consumes chunks without buffering a whole body and
records SQL statements separately from binding calls, max page/batch rows,
chunk bytes and first-chunk local wall time. Account CPU/D1 rows remain null.
The8MiB output review threshold and512MiB controller threshold are not raised.
JSON/browser final Blob whole-file memory remains an explicit risk.

Re-run the existing reproduction command locally and replace the historical
samples with newly observed output after review. Do not infer billing/account
compatibility from local wall time. No paid service was provisioned.

## Historical decision after measurement

Keep the current indexes. Do not add FTS or a materialized sort key yet.
The populated 10,000-task list/search/calendar samples below remain below the
existing 1,000 ms local review ceiling. Their plans still scan and sort; result
pages are bounded, scanned rows are **not** bounded by a seek. An index guessed
from the temporary sort alone would add write/storage cost without an observed
local latency benefit. Production D1 rows and CPU remain unmeasured and could
justify a later migration. No limit was raised and no migration changed.

A different issue is measured: the populated 10,000-task CSV exceeds the existing
8 MiB review threshold. The full snapshot is explicitly unbounded and must not
be silently truncated. Streaming/chunking export deserves a separate design
before using large real ledgers; this slice does not claim that risk solved.

## Method and reproduction

```sh
npm ci
npm run build
node --import tsx scripts/measure_resources.ts /absolute/outside/repo/resources.json
```

Only the output argument outside the repository is written. Disposable Miniflare
uses all eight migrations. Profiles have 100, 1,200 and 10,000 tasks, with one
audit event, source item, task evidence, pending candidate and candidate evidence
per task. Counts are asserted before requests. All records are synthetic. Set-based
fixture inserts avoid the previously measured RPC fanout problem. Candidate pages
and task-detail evidence are now populated, unlike the earlier empty profile.

Each real shared route is warmed once, then five full responses are timed; export
runs once per profile to respect the existing four/minute budget. Wall time
includes Node/Miniflare IPC, D1 and serialization; it excludes production JWT
verification. Five samples are not a production p95. SQL plans are captured from
actual handler statements. Separate list/title-search/month traversals follow
real cursors to exhaustion and assert exact independent counts and no duplicates.
They do not raise the API page size. No contents are printed.

Captured 2026-11-09T09:52:08.581Z, Node v24.22.1. Timing and gzip output vary
with load/runtime. Full plans/samples/counts: [RESOURCE-MEASUREMENTS.json](RESOURCE-MEASUREMENTS.json).

## Production artifacts

| Artifact | Raw bytes | gzip level9 bytes |
|---|---:|---:|
| Application JS | 309,154 | 98,262 |
| Worker dry-run bundle | 497,776 | 99,629 |

The JSON inventories all 14 public files. JS is below the proposed 200 KiB gzip
initial-JS ceiling. This is file compression, not measured transfer or phone startup.

## Actual local route observations

| Tasks | Route | Median ms | Max ms | Response bytes | Statements |
|---:|---|---:|---:|---:|---:|
| 100 | `/tasks?limit=100` | 45.985 | 54.156 | 43,318 | 3 |
| 100 | `/tasks?limit=100&title_only=1&q=needle` | 40.44 | 48.185 | 560 | 3 |
| 100 | `/tasks?limit=100&date_from=2035-12-01&date_to=2035-12-31&timezone=Asia%2FMakassar` | 43.532 | 49.188 | 3,587 | 3 |
| 100 | `/history?limit=50` | 41.712 | 50.298 | 15,600 | 3 |
| 100 | `/history?limit=50` | 36.975 | 43.854 | 15,602 | 3 |
| 100 | `/tasks/resource-00000?view=read` | 51.267 | 58.479 | 1,115 | 6 |
| 100 | `/candidates?limit=50` | 39.23 | 43.34 | 23,643 | 3 |
| 100 | `/export?format=csv` | 90.795 | 90.795 | 235,965 | 24 |
| 1200 | `/tasks?limit=100` | 39.937 | 40.948 | 43,583 | 3 |
| 1200 | `/tasks?limit=100&title_only=1&q=needle` | 35.807 | 44.77 | 989 | 3 |
| 1200 | `/tasks?limit=100&date_from=2035-12-01&date_to=2035-12-31&timezone=Asia%2FMakassar` | 43.876 | 46.935 | 43,435 | 3 |
| 1200 | `/history?limit=50` | 36.901 | 39.652 | 15,800 | 3 |
| 1200 | `/history?limit=50` | 36.554 | 37.793 | 15,805 | 3 |
| 1200 | `/tasks/resource-00000?view=read` | 49.34 | 56.097 | 1,115 | 6 |
| 1200 | `/candidates?limit=50` | 37.541 | 40.817 | 23,643 | 3 |
| 1200 | `/export?format=csv` | 242.451 | 242.451 | 2,811,656 | 24 |
| 10000 | `/tasks?limit=100` | 45.126 | 79.617 | 43,583 | 3 |
| 10000 | `/tasks?limit=100&title_only=1&q=needle` | 43.698 | 46.336 | 1,418 | 3 |
| 10000 | `/tasks?limit=100&date_from=2035-12-01&date_to=2035-12-31&timezone=Asia%2FMakassar` | 48.985 | 54.702 | 43,581 | 3 |
| 10000 | `/history?limit=50` | 33.265 | 35.347 | 15,801 | 3 |
| 10000 | `/history?limit=50` | 33.692 | 39.652 | 15,805 | 3 |
| 10000 | `/tasks/resource-00000?view=read` | 47.106 | 55.21 | 1,115 | 6 |
| 10000 | `/candidates?limit=50` | 37.794 | 50.241 | 23,643 | 3 |
| 10000 | `/export?format=csv` | 1265.611 | 1265.611 | 23,438,847 | 24 |

Counts include the two durable accounting statements. Task detail has four read
projections; export has eleven schema plus eleven snapshot reads. History cursor
uses `SEARCH task_events USING INTEGER PRIMARY KEY (rowid<?)`; scoped history uses
`task_events_task_cursor`. Task list, title search and month calendar still show
`SCAN tasks USING INDEX tasks_local_date` and `USE TEMP B-TREE FOR ORDER BY`.
Leading-wildcard search cannot be called an indexed title seek. Populated candidate
evidence uses the candidate/evidence/source indexes with temporary ordering.

## Cursor traversal evidence

| Tasks | Query | Pages | Unique rows | Expected rows | Total local wall ms |
|---:|---|---:|---:|---:|---:|
| 100 | `/tasks?limit=100` | 1 | 100 | 100 | 36.909 |
| 100 | `/tasks?limit=100&title_only=1&q=needle` | 1 | 1 | 1 | 38.366 |
| 100 | `/tasks?limit=100&date_from=2035-12-01&date_to=2035-12-31&timezone=Asia%2FMakassar` | 1 | 8 | 8 | 40.689 |
| 1200 | `/tasks?limit=100` | 12 | 1200 | 1200 | 470.902 |
| 1200 | `/tasks?limit=100&title_only=1&q=needle` | 1 | 2 | 2 | 35.255 |
| 1200 | `/tasks?limit=100&date_from=2035-12-01&date_to=2035-12-31&timezone=Asia%2FMakassar` | 1 | 100 | 100 | 37.441 |
| 10000 | `/tasks?limit=100` | 100 | 10000 | 10000 | 4884.428 |
| 10000 | `/tasks?limit=100&title_only=1&q=needle` | 1 | 3 | 3 | 44.262 |
| 10000 | `/tasks?limit=100&date_from=2035-12-01&date_to=2035-12-31&timezone=Asia%2FMakassar` | 9 | 833 | 833 | 424.412 |

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

The measurement controller's ending RSS sample was 524,808,192
bytes. It excludes the separate workerd process, browsers and Gradle. It is not
peak RSS, a Linux parser measurement or an Android memory profile. Proposed
review threshold for this controller sample:512 MiB (only about11.5MiB above this observed sample; review before larger runs, peak remains unmeasured); the existing parser peak
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

## Selected export guardrail — 2026-11-10 implementation, not measurement

EXPORT_MAX_ROWS now defaults to100000 total rows in selected canonical tables;
owner-configurable1–1000000. Over-limit preflight returns413 before body creation.
Choose a single allowlisted table to reduce transfer work. Partial JSON is not a
restore backup. Counts/epoch/column preflight and epoch-conditioned JSON reads
protect snapshot/cap coherence. CSV keeps256-row pages,8-page batch cap and16KiB
chunks. No index was added and no old measurement was replaced.

These are source settings, not measured memory or throughput. JSON and browser
Blob buffering, arbitrary large rows, OFFSET scans and real D1/Worker limits remain
risks. New bundle/export/query/CPU observations are NOT RUN/null by owner request.
Re-run measure_resources.ts before claiming an improvement or raising review ceilings.
