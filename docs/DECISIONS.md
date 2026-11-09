# Architecture decision records

Version 0.2.0, 2026-11-06. Accepted means a design/scope decision, never an implemented feature. User decisions are in [16](16-OWNER-DECISIONS.md). Original v0.1 remains available in git history at base `293525f96a473fcbcab9026df58e16d17a18d59a`.

| ADR | Status | Decision and consequence |
|---|---|---|
| 001 Hybrid memory | Accepted, refined | Worker/D1 canonical memory and reminders; Linux normalization/AI; phone local queue. Laptop-off means no new Linux processing, not failed cloud task access. |
| 002 WhatsApp methods | Supersedes export-only-first ADR | Listener and exports both MVP; real-device feasibility in M0. Export-only release is limited preview, not full completion. |
| 003 AI adapter | Accepted | Existing 9Router replaceable; no account management. Route/provider consent explicit; no hidden fallback. |
| 004 Approval | Strengthened | Every AI task and task mutation needs explicit owner review, not only disputed deadlines. |
| 005 Cloud minimization | Supersedes excerpts-optional ADR | Minimized structured proposals/tasks and opaque references only. Raw text/quotes/cloud raw backups prohibited; remote raw evidence unavailable. |
| 006 Authentication | Proposed, M0 gate | Cloudflare Access + verified Worker identity and source-scoped collector auth; evaluate OIDC only if needed. No insecure deployment fallback. |
| 007 Frontend | Recommended for M0 verification | React + TypeScript + Vite/static PWA reflects owner familiarity; no SSR. Android/browser/dependency versions must be verified and pinned. |
| 008 Reminder independence | Accepted | D1 cron/inbox independent of AI/Linux; push best-effort; lease and delivery states distinct. |
| 009 Responsibility domains | Accepted owner decision | Academic and organization contexts equal throughout schema, UI, extraction, search and reminders. Single owner, not teams. |
| 010 Phone transport | Accepted requirement; vendor proposed | Private remote phone→Linux, no raw cloud storage. Tailscale/WireGuard candidate; account/device test and provider metadata decision required. |
| 011 Budget | Supersedes hard-zero constraint | Prefer $0; paid candidates permitted with concrete benefit/cost and specific spending approval. No automatic subscription. |
| 012 Linked-device client | Research-only owner decision | M0 compares unofficial adapter such as Baileys; no linking or implementation added to confirmed MVP. |
| 013 Repository layout | Accepted planning organization | Root docs/schemas/examples canonical; former package/root duplicate PRDs become pointers. Avoid divergent instructions. |
| 014 Wire contract | Proposed v2 normative specification | Strict local/cloud schemas, no arbitrary candidate_json/excerpts, source generation and CAS. Breaking from unimplemented v1; M0 validates TS/Python adapters before code depends on it. |
| 015 Deletion | Accepted design refinement | Source generation tombstones and offline device acknowledgments; unsupported task retain/delete owner decision; backups honor purge. |

## ADR-010 detailed feasibility choices

Private overlay is preferred over a public tunnel terminating raw content in cloud. Candidate Tailscale offers documented Android compatibility and encrypted relays, but owner has chosen only private remote connectivity, not a vendor. Evaluate actual device/VPN coexistence, control-plane metadata, relay policy, NAT, key expiry, ACL and cost. Direct WireGuard is an alternative if manageable. No always-on raw-processing VPS is assumed; that would change privacy/location decisions. Rollback: revoke pairing/network access and retain local queue/export flow, with full-MVP transport gate visibly blocked.

## ADR-014 contract rationale

V0.1 permitted raw excerpts and an untyped nested candidate object, while missing candidate version and source generation. V2 represents minimized structured proposals and safe evidence metadata directly; server semantic validation resolves references and dates. JSON Schema constrains shape, not truthfulness or perfect PII detection. Original local evidence remains separate. Since no app existed, migrate specification once instead of retaining permissive legacy compatibility.

## Decision change procedure

Record date, status, requirement/source, alternatives, consequence, affected feature/test IDs, rollout and rollback. Proposed provider/framework/tool version is not marked verified until tested. Do not use an ADR to silently weaken confirmed privacy, approval or dual-ingestion scope.

## ADR-016 — Implementation baseline (2026-11-06)

Owner expanded authorization from M0-only to the whole system. Proceed with independent slices while retaining real-device/account release gates. React/Vite static PWA, Worker/D1, Python local evidence and Kotlin probe are now actual code. Exact dependency versions are locked; pre-release Miniflare 5 proved incompatible with the legacy harness options, so stable v4 is pinned. Production identity uses verified Access JWT issuer/audience/subject, with no deployed dev-identity flag. Synthetic tests inject identity only through a separate non-deployed loopback runner. Local UI/API share an origin to retain Origin enforcement without development-proxy rewriting. Cloud scheduler currently delivers durable in-app inbox only; external push is explicitly unconfigured. At this initial checkpoint Android build/device/transport proof remained blocked; ADR-017 records later local progress. No native task UI was added.

## ADR-017 — Connected processing and private sender (2026-11-06)

The owner requested continued whole-system implementation with placeholder credentials because this is a shared account. All checked-in runtime examples remain `UNCONFIGURED`; usable credentials, provider calls, deployment and paid provisioning were not introduced. Native pairing credentials are generated at runtime, encrypted locally and source-scoped; no shared demo credential authenticates production.

The local browser now connects selected evidence, redacted preview, source/provider/route consent, strict extraction validation, projection review and durable encrypted jobs. Cloud sync reuses immutable reviewed envelopes and checks source generation before sending. The native sender uses a private HTTPS endpoint, exact leaf-certificate SHA-256 pin plus normal hostname verification, HMAC request signatures and receipt-confirmed queue deletion. A five-minute invitation contains no long-lived credential; one-device retry recovers a lost pairing response. Platform jobs retry when networking permits. Certificate pin rotation requires explicit re-pairing after syncing/wiping pending data. Do not replace pinning with an accept-all trust manager.

The Kotlin build and lint now pass with Java 17 / Android SDK 35. The notification messaging-style read was corrected to an API-24-compatible recovery path for Android 9. Android 12+ backup and device-transfer exclusions supplement disabled backups. Actual Android 9 tests, private overlay/VPN choice and power/background behavior remain release gates.

Task title edits preserve deadline revisions. Reminder rule changes invalidate old intents atomically and enqueue bounded, future-only rebuilds, including after disposable canonical restore. Quiet hours use the owner timezone and defer/coalesce new inbox notifications without changing task deadlines; repeated/skipped daylight-saving hours are checked using actual UTC instants. No push delivery is claimed. Source purge distinguishes user-owned edits from sole-source unedited AI tasks; Linux acknowledges local wiping, while cloud phone-wipe status remains explicitly unverified.

Validation: synthetic local Worker/D1, browser, Python and HTTPS tests plus native compile/lint. Rollback: pause sources, revoke collector/device credentials, retain manual/export workflows and do not release dual-ingestion MVP until device gates pass.

## ADR-018 — Queue privacy and API-28 guard (2026-11-06)

Owner-requested slice based on `d0cbb60`: F07/F08, W01/W21. Use independent Keystore HMAC-SHA-256 for dedupe; a public salt still permits dictionary confirmation. No dependency is added. Every legacy v1 database enters visible repair-required state; only owner confirmation deletes queue/sidecars, encrypted pairing/batches and keys. Until reset, legacy hashes remain in that blocked database. Untransferred events are lost on reset, capture pauses and pairing must be redone. Missing encryption keys with queued/pairing ciphertext and missing HMAC keys with queued rows never silently regenerate. A durable reset marker survives interrupted cleanup. Do not replace these rules with hidden key replacement or loss masked by retention expiry.

Compile all Kotlin against actual API-28 stubs without host JDK APIs, alongside SDK-35 build and fatal NewApi/InlinedApi lint. This catches inherited-interface/missing-method classes of errors; it is not Android runtime proof. Five plain-JVM tests use an injected key provider and real JCA crypto, not Android Keystore. Device smoke and full matrix remain mandatory. Actual fault-injection failures/restored passes belong in SESSION-CHECKS. No milestone/device/account/peer/push gate is marked complete.

## ADR-019 — Explicit action attestations and local observations

Use durable source-scoped device action/phase journals instead of inferring success from timeout, receipt issuance or device disappearance. Linux remains the private relay; an unavailable laptop leaves actions unresolved. Expiry and retirement label age/history only; late explicit acknowledgments remain evidence. Known inventory is never asserted complete. Paired-device signatures establish origin at Linux; cloud trusts the scoped collector relay, not an independent hardware proof. No new dependency, raw cloud relay or AI-approval change is introduced. Existing control kinds are purge/revocation and receipt cleanup; arbitrary remote commands are not exposed.

A local adb observation collector with strict field projection was chosen over uploading logs/screenshots or allowing manual PASS labels. Fresh per-launch probe tokens avoid stale/double-render evidence. Unsupported/unrun fields remain unavailable/not_run and overall smoke stays unverified. Real phone/account/network/push and full capture matrix remain unverified; no milestone is complete.

## ADR-020 — Evidence observations and bounded provenance

Read back and hash the installed single APK at both ends rather than trusting the local requested file. Install success needs an observed successful install response plus readback match. Stamp a source revision into the APK only from a clean Git checkout; the observer reads that declaration instead of guessing from its own checkout. This is declared provenance, not proof against an untrusted builder or concurrent source edits. Dirty/unknown/ambiguous observations remain null.

Use a token-bounded continuous crash stream rather than a log tail or device-clock cutoff. Incomplete/ambiguous attribution stays unknown. Foreground/process lifecycle evidence replaces activity-history matching. A local HMAC-sealed begin/end journal prevents accidental retroactive PASS edits; the owner/root with the key remains outside that integrity claim. Only mechanically proven permission transitions can automatically pass; other matrix cases are recorded but UNVERIFIED. No new dependency or physical capture claim is introduced.


## ADR-021 — Pixel-paper UI contract reconciliation (2026-11-06)

Status: **Accepted engineering resolution under explicit owner delegation** ("Refine it yourself"), following
[owner-supplied design instructions](design/UI-DESIGN-AGENT.md) §0.
Base: `5ae9583`. This record is a proposal, not an implemented or verified feature.

The attached [prototype](design/reference/app.html) is preserved byte-for-byte.
It is a synthetic design reference only, not production data or a deployed app.
Opening that unmodified prototype requests Google Fonts; production must instead
self-host fonts and must not copy its external font calls or in-memory mutations.

### Contract differences requiring explicit resolution

| Topic | Current contract | New supplied design | Proposed resolution |
|---|---|---|---|
| Desktop navigation | docs/06-UI-UX.md: slim sidebar | §2/§4: centered 430px column and bottom navigation | Adopt new phone-first centered column on all sizes; retain access to search, sources, history and settings through a labeled menu. |
| Appearance | docs/06-UI-UX.md: proposed teal/system-font/rounded baseline | §1–§2: blue, self-hosted Inter/Pixelify Sans, square ink borders and hard shadows | New pixel-paper reference supersedes the earlier proposed visual baseline. |
| Write feedback | docs/06-UI-UX.md: save success only after server acknowledgment | §6/§8: optimistic toggles and mutations | Pending feedback may be immediate, but final success and counts reconcile only after server acknowledgment; failure restores canonical state and preserves retry identity. Offline writes stay disabled. |
| Undo | docs/10-API-CONTRACTS.md has no compensating review action | §5.4: durable compensating undo | Implement only in S4 with an explicit versioned API/database contract, source-generation checks and concurrency tests; never restore a client-side snapshot over server history. |

### Engineering interpretation proposed for subsequent slices

Preserve existing module layout and authentication/offline/privacy machinery.
Use existing React, browser History/URL, fetch and IndexedDB rather than adding
React Router, TanStack Query, Zustand or idb just to match suggested stack names.
Those packages are not necessary to achieve the requested behaviors; this avoids
a rewrite and follows the session's dependency limit. No new dependency added.

Do not store or display original approximate-date expressions in the cloud; show
a localized approximate-precision label and safe issue codes instead. Date-only
ordering remains local-calendar ordering, never a fabricated exact UTC deadline.
Retain personal contexts and existing search/history/source workflows, even where
the prototype illustrates only academic and organizational tasks.

Contrast and text resizing outrank literal inaccessible prototype values: dark
accent fills need an appropriate contrasting foreground; completed text must not
be faded below the required contrast. Warning color remains decorative only.

### Scope, rollout, evidence and rollback

Affected: PWA interface/offline F20 and offline-write exclusion F30; Android
identity/accessibility from the original product-polish brief. No feature or test
ID is invented by this note. Interface contract reconciled below, then follow
S1–S7 from the supplied spec, stopping for owner review after each slice. Android
identity/accessibility and large-ledger pagination remain authorized outstanding
work; importing this design does not quietly cancel them.

This intake initially changed documentation only. Subsequent S1 changes and actual check results are recorded in STATUS/VERIFICATION-LOG; this ADR does not itself certify them. No milestone complete. Last recorded notification_access is
false; no listener event or capture matrix has ever run. New capture status is
unverified. No GitHub push, deployment, provider/account/device operation or paid
provisioning performed.

Rollback: revert the S1 commit(s) and restore the former shell without changing stored data. The owner delegated resolution; S1 is implemented with its actual checks recorded in STATUS/VERIFICATION-LOG. Later slices remain subject to the design spec review checkpoints.

## ADR-022 — S2 read models and marker coverage (2026-11-06)

Accepted implementation decision within the owner's explicit S2 scope; not a
milestone or device verdict. W11/W41, F03/F15/F20/F22; source base `6de38fd`.

Remove logcat `-T 1` rather than clear logs or alter the null policy: the owner's
API-28 experiment shows the flag hides the monitor's own markers, and fresh run
tokens already bound coverage. Keep both markers on one stream and unknown for
incomplete coverage. A process-boundary fake exercises start/stop/reader threads;
this models the measured failure but does not replace an owner-run hardware check.

Use `GET /tasks/:id?view=read` with one transactional D1 read batch for canonical
fields, active safe source aliases, effective scheduler policy and task-scoped
history (30 rows plus lookahead). Reusing global last-100 history could omit this
task entirely or mix another task's events. Cursor by monotonic event ID avoids
clock-based reordering; index migration 0005 bounds the lookup. On a later-page
version change the UI reloads the latest first page instead of mixing revisions.
The repository implements reminder policy in `settings.reminder_policy`, not a
`reminder_rules` table; expose that effective policy with configured/default
origin using the scheduler's shared default function. Do not invent another table
or copy suggested reminder text into the UI. Policy is never delivery evidence.

Compare exact instants in the configured owner's calendar for grouping; keep
date-only values as local calendar dates and sort them after timed entries on that
date, without synthesizing a deadline instant. Within a date, sort exact values
by their stored UTC instants so a DST clock rollback cannot reverse them. Compute
each sort key once, rather than formatting it repeatedly in the comparator. Approximate labels stay generic:
the original expression is prohibited in cloud projection. Approximate and
unknown tasks share the no-confirmed-date group and retain distinct labels, even
when completed: the explicit owner requirement to keep unknown dates under
Tanpa tanggal takes precedence over the prototype's done-first grouping. Dated
completed tasks are in Done. Archived tasks
stay out of the active groups. Missing context metadata is unavailable, not
implicitly Personal. Personal remains a supported fourth filter under ADR-021.

Use existing bounded task pages and disclose loaded-subset counts, including the
no-date row; do not load a year eagerly or infer missing tasks. Banner/badge counts
come from the aggregate briefing, not the bounded candidate page. The no-date
navigation resets previous context/search filters before scrolling to that group.
Large-ledger calendar/server-query expansion remains a separate outstanding gate.

S2 is read-only, overriding active write controls in the visual reference for this
slice. Completion/save/add controls are disabled with an explanation. Precision
and quick-add sheets are previews, not functioning writes. Existing writers on
legacy Calendar/Settings/Review surfaces remain unchanged; their preservation is
not S3 implementation. No optimistic write, undo, haptics or new approval path.
Use browser History for tabs/detail/sheet entries and native modal dialogs with
focus return; keep the full-screen background hidden while detail is active.
One shared visible-page clock drives countdowns. Keep cached task detail visibly
labeled with its snapshot timestamp; unavailable history/policy never becomes an
empty or fabricated result.

Contrast outranks literal token use: use a darker red text token on paper and an
appropriate dark-theme foreground on filled chips. Keep original urgency segment
colors. Completed text uses readable muted ink and strike-through, not 50%
opacity. Scope automated geometry/contrast evidence to the tested surfaces and
pinned Chromium. TalkBack/real Chrome 138 and full accessibility audit remain
unverified; no dependency, account, provider, deployment or raw-data path added.

History-page failures retain the known task and prior events, with an explicit
error beside history and a retry control. Treating a failed older-page read as a
missing task would conceal valid observations. A simulated 503/retry browser test
protects this distinction. Informational toasts do not intercept underlying
controls; there is no interactive toast action or undo in S2. Relative countdowns
use the browser clock, not an independently verified trusted clock.

## ADR-023 — S3–S7 implementation-only handoff (2026-11-07)

The owner explicitly requested all S3–S7 in one go and then instructed: “do not
run a test … let my other agent do it … complete build only”. That supersedes
intermediate slice-review stops and this session's test-execution requirements.
It does not waive privacy, explicit approval, or any release gate. No new
application dependency. Native Android/collector implementation is preserved.

Use one owner-scoped IndexedDB journal for an explicit online operation, written
before sending its immutable body, version and idempotency key. Prefer manual
same-request retry over background writes or a new key after an uncertain
response. Reconnect only refreshes reads. Network/5xx/408/425/429 leave the
operation pending; definite other 4xx responses roll it back. Authentication
denial clears the private session. This is recovery of an already-authorized
online request, not support for creating offline writes. Optimistic completion
changes its visible check/label while canonical counts/groups wait for an ack.

Undo is a compensating owner review, not a history deletion or a stale snapshot
written back by the browser. Migration 0006 records structured inverse fields
and evidence IDs; atomic source-generation/candidate/task guards prevent undo
after a later edit or purge. A restored deadline receives a new revision and
future-only reminder intents. New-task undo soft-deletes and keeps historical
evidence links so later purge can scrub the tombstone. Source purge disables and
scrubs affected inverse records; history payloads for affected reviews are
scrubbed conservatively while event identity/type/time remain. Inverse records
are intentionally excluded from canonical backups: restoring a backup must not
restore a latent power to undo old approvals. The toast lasts 4.5 seconds; server
correctness uses versions/generations, not the browser clock. A conflict rejected
without a selected target has a candidate audit only; no task association is
invented. Selecting a target also records the rejection in that task's timeline.

Calendar requests one bounded month, with cursor loading and explicit partial
counts/dots, instead of fetching a year into memory. Exact timestamps use actual
owner-calendar UTC boundaries; date-only values stay literal local dates.
Approximate/unknown dates never acquire calendar cells. Context/title queries
also page on the server rather than filtering only the first global page.

Cache successful structured read observations in owner-scoped IndexedDB, capped
at 24 view entries plus root/utility snapshots. Missing observations are
unavailable, not empty results. Mutations invalidate prior observations, and an
authenticated source-generation change invalidates cached evidence-derived
views. Language/theme stay browser-local; owner timezone is versioned on Worker.
Encrypted backup/restore stays in the existing Linux workflow; there is no fake
browser restore or raw-data upload.

Service-worker Cache Storage is only for public build-matched bytes. A build
plugin pins public asset hashes and a per-build cache name; login/error HTML
cannot be admitted as a shell asset. API and Access requests are never handled
by that cache, and online navigation documents are never stored. This uses the
existing Node/browser crypto APIs. Maskable PNG icons use Python stdlib pixel
rendering, matching the existing star rather than introducing an image library.

Motion, optional haptics, native buttons/modals, readable accept/reject text,
keyboard equivalents, labels and reduced-motion rules are implementation work.
They are not accessibility, visual-regression, browser or hardware evidence.
All behavioral validation is delegated and NOT RUN here. No milestone complete.

## ADR-024 — Implement accepted native A/B/C without retiring the PWA

2026-11-08. Implements the owner's accepted PLAN-NATIVE and BRIEF-ASTRA on base
6bbfa26. Per-install expiring/revocable owner authority (0007), an Origin-rejecting
native namespace, and platform Views are retained. No new dependency or identity
provider is added. Canonical Worker handlers remain shared with the PWA.

The standalone API-28 compiler needed the generated application R constants once
UI resources existed. Its classpath now adds only that R.jar, and it depends on
resource generation. API-28 stubs, no-host-JDK flags, full-source coverage and
assemble/lint prerequisites remain. An inventory assertion rejects production
Kotlin outside the checked source tree. Narrowing the check was rejected.

Native review uses an explicit button and confirmation. Swipes reveal guidance;
keystrokes, date edits and draft saves do not approve/reject. This follows the
latest owner constraint rather than the old prototype's committing swipe. Local
request recovery uses immutable same-key retries and a transactional receipt plus
form/journal invalidation; reconnect only reads. The PWA remains until real native
parity and owner acceptance. Account path isolation and phone acceptance are
unverified gates, not waived by this implementation.

## ADR-025 — Generic push wake-ups, bounded queries and durable application budgets

2026-11-09, base c4497da, W40/W41/W42 and F15/F16/F19/F21/F25.

Use empty-body VAPID Web Push to wake a generic same-origin inbox notification.
Existing jose/WebCrypto suffice. Rich encrypted payloads were rejected because
this feature needs no task data at a push provider. Inbox creation remains the
scheduler transaction; external sending can neither duplicate nor remove it.
Persist one unknown attempt before sending; automatic replay after an ambiguous
send was rejected because physical receipt cannot be inferred. Provider acceptance
is explicitly not phone delivery. Key rotation/revocation needs explicit browser
resubscription. Unknown provider hosts are unsupported, not an SSRF escape hatch.

Inspection found server-backed search/calendar already implemented. Preserve
those paths instead of rebuilding them. Bind task cursors to filters, page global
history with immutable descending IDs, retain partial disclosures and prior pages
on failure. Cursors are opaque continuation tokens, not access credentials or
snapshot isolation. Old task cursors require refresh after upgrade.

Persist application request counters in D1 rather than isolate memory, with fixed
per-class minute and shared daily limits. This is request accounting, not billing,
CPU or account quota integration. It adds database work; real account limits and
cost observations remain gates. Health reports observations with timestamps;
missing, stale, failed and future-clock reports cannot become healthy by default.
Source sync freshness never proves current listener permission or full capture.

Migration0008 stores only push endpoint authority, dispatch state and sanitized
operational counts/reports; all are excluded from canonical export/restore.
No dependency, capture-selector, approval, authentication namespace, Origin-guard,
signing or verifyApi28 change. PWA remains until native owner acceptance. Actual
push/device/account/privacy-sink and production migration observations are
unverified. No milestone complete; no deployment or provisioning authorized here.
Full behavior, limits, alternatives and rollback notes: [RELEASE-GAPS](RELEASE-GAPS.md).

## ADR-026 — Same canonical snapshot for JSON, safe CSV and disposable restore

2026-11-09, base af1879b; W42/F23, with W30/W31 boundary evidence and W00/F25
measurements. This completes the already-promised CSV option; it is not a new
raw-data export. Move the unchanged eleven names into a shared JSON allowlist
used by Worker JSON/CSV and Linux backup. A one-file union-column CSV was chosen
over a ZIP of per-table CSVs: one rectangular header, one row per canonical row,
no library/dependency, and direct per-table parity checks. Formula neutralisation
happens before RFC4180 quoting. CSV is intentionally a spreadsheet view; JSON
retains exact null/empty values and is the encrypted restore input.

The adversarial corpus exposed contact-only redaction leaving known secret-shaped
source values in the provider JSON. Redact those local patterns before contact/
date handling. Refusing every selected batch was rejected because safe minimized
obligations can still be proposed after preview. This is a tested heuristic, not
universal secret detection. The SYSTEM prompt, strict schema and mandatory owner
approval were not weakened. Schema/subset/auth/version checks, not prompt prose,
are the actual rejection controls. Provider/model behavior remains unverified.

Query measurements revealed bounded results with whole-index task scans/sorting.
Document measured query shape and proposed review thresholds rather than adding
speculative indexing or claiming local wall time is Worker CPU/billing. All real
account/device/positive capture/provider/restore gates remain open. No signing,
capture selector, deployment or paid provisioning change.
