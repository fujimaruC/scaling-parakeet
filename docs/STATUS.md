# Project status — evidence and remaining work

**2026-11-09 · Asia/Makassar. CSV/adversarial-contract/traceability/resource builder slice, fresh-clone base af1879b. Synthetic/local evidence only; production, device and provider gates remain open. No milestone is complete.**

Historical whole-system baseline: `58f00ed4770f16ae5bf73e205cad8c293bfea608` (GitHub main fetched at session start). Working branch: `build/academic-os-system`; prior implementation checkpoint `43c6ecd`. Owner authorizes all milestones with placeholder credentials in shared materials. No remote push, deployment, real chat import, real AI request or paid provisioning performed.

## Current focused follow-up — base d0cbb60

Base: `d0cbb60972ad8fb198e058c1802a6889164c27a1`; branch `fix/android-api28-private-queue`, fresh GitHub clone. Owner updated the requested base from 6d8a2f3; required reading files were unchanged. Scope: queue privacy/key-loss recovery, API-28 compatibility and device smoke documentation. No dependency, ledger rewrite, AI-approval or cloud-boundary change. No push/deployment/paid provisioning or real-data import.

Implementation: domain-separated Keystore HMAC separate from AES; missing-key checks cover queue and encrypted pairing/batch state before retention writes. Visible repair UI and durable reset marker; pause rechecked under queue/reset lock. Every v1 database requires owner-confirmed reset (including empty legacy queues). Until then old hashes remain in a blocked legacy database. Reset discards untransferred data and encrypted pairing/batches, deletes sidecars/keys, pauses capture and requires re-pairing. Cancel preserves blocked data. Do not silently reverse this policy.

`verifyApi28` compiles all Kotlin against API-28 stubs without host JDK APIs; NewApi/InlinedApi lint is fatal. Five plain-JVM policy tests use standard JCA and an injected key store, not Android Keystore/SQLite. Mutation checks undo each fix and inject incompatible Android/Java APIs. Actual outcomes and output are recorded in [SESSION-CHECKS](SESSION-CHECKS.md).

The chat workspace reset before the first result could be packaged. Source was reconstructed and all acceptance checks are rerun; only retained, freshly captured output is used for this deliverable. Earlier passing results from the discarded workspace are not substituted.

Actual device/emulator, key loss/invalidation, SQLite/process/disk/reset interruption, listener capture, real peer/network, account/provider/push and pilot tests remain **unverified**. M0 and every release gate remain incomplete. Owner must run [DEVICE-SMOKE](DEVICE-SMOKE.md), then [the longer capture matrix](14-ANDROID-COMPANION.md#required-actual-device-matrix). Existing device evidence below belongs to the owner's earlier session.

## Implemented and exercised locally

| Area | Evidence |
|---|---|
| Workspace | Locked npm/Python dependencies, separate React/Worker/contracts/Python/Kotlin projects, CI definition |
| Ledger | Fail-closed owner JWT checks, contexts, task CRUD/CAS/audit, cursor pagination/filtering, exact/date-only/approximate/unknown dates |
| Review | Scoped signed proposal ingestion, source generations, explicit approve/edit/reject/clarification, explicit deadline target and version, immutable retry |
| PWA | Today/list, task editor, month calendar, partial-page disclosure, proposal corrections, aggregate briefing, context/source setup, history, inbox, ID/EN/themes, canonical export |
| Reminders | Independent D1 intents/cron/inbox, enabled/offset/date-only rule editor, bounded future rebuild, stale revision cancellation, read/snooze and owner-timezone quiet hours; external push unconfigured |
| Offline | Compiled service worker offline reload, structured IndexedDB read-only snapshot, logout deletion and stale-response write guard |
| Linux ingest | Local authenticated import/evidence UI, repeat export deduplication, encrypted evidence, immutable signed phone receipts, generation revocation |
| Processing | Selected evidence/preview/provider consent/extraction/projection review/encrypted job/retry UI connected; real provider remains unconfigured |
| Phone transport | One-device expiring invitations, private HTTPS/certificate pin/hostname checks, encrypted immutable sender batches, receipt cleanup, periodic retry, revoked-source wipe; synthetic Linux HTTPS integration |
| Android | Debug APK compiled; Android lint completed; API-28-compatible messaging-style access, permission/lifecycle/filter/encrypted queue source, backup/transfer exclusions |
| Purge | Cloud scrubs sole-source unedited AI tasks in delete mode, preserves manual ownership; local source-status preflight/wipe acknowledgment; phone acknowledgment explicitly unverified in cloud |
| Backup | Encrypted canonical export and disposable SQLite restore parity; future-only rebuild queued after validation; no raw evidence/credentials/old delivery intents restored |
| Calendar import | Conservative ICS preview parser; recurrence/floating-time uncertainty flagged; actual ITK unverified |

## Earlier whole-system evidence (historical)

All data used for automated verification was synthetic.

- `npm run check`: **PASS**, including **16 local D1 integration tests**, formatting, TypeScript, static PWA build and Worker dry-run build. Formatting is the current lint check; semantic ESLint is not configured.
- `npm run test:e2e`: **5 passed** — task persistence/completion/offline, 360px/themes, task edits/date precision/month calendar corrected proposal approval and repeated reminder-rule saves.
- `npm run test:pwa`: **1 passed** — actual compiled service worker offline hard reload and private snapshot deletion on logout.
- `.venv/bin/python -m unittest discover -s collectors/local/tests -v`: **19 passed** — import/encryption, receipt retry/mutation rejection, malformed transaction rollback, pairing expiry/revocation, provider consent/route changes, evidence scoping, projection retry after restart, cloud purge, TLS transport, local browser auth, restore and ICS.
- `python scripts/validate_planning.py`: schema/examples/rejections/relative-link validation; distinct from app tests.
- `python scripts/check_placeholders.py`: **PASS** for common private-key/provider-token formats in tracked and nonignored project files. This limited scanner is not an exhaustive secret audit.
- `./gradlew assembleDebug lintDebug --no-daemon`: **PASS**, Java 17 / Android SDK 35, debug APK produced. JDK/SDK setup blockers from the previous checkpoint were resolved. Remaining lint warnings include custom pinned trust manager, intentional synchronous credential persistence, missing launcher icon and native translations. No actual device or emulator tests performed.
- Re-verified this session on the owner's machine: `npm run check` **PASS**; `npm run test:e2e` **5 passed**; `npm run test:pwa` **1 passed**; `.venv/bin/python -m unittest discover -s collectors/local/tests` **19 passed**; `scripts/validate_planning.py` **PASS**; `scripts/check_placeholders.py` **PASS**.
- `./gradlew assembleDebug` against the actual phone toolchain required JDK 17 and Android build-tools 35.0.0; both were missing from this machine and were provisioned locally (Temurin 17 under `~/.local/opt`, SDK component via `sdkmanager`). APK **2.44 MB**, installed and launched on the owner's CPH2015 (Android 9 / API 28).
- **Device defect found and fixed:** `Queue` did not implement `AutoCloseable` on API 28, so `use{}` threw `ClassCastException` and `MainActivity` crashed on launch. Compile, lint and synthetic tests all passed while the app was unusable. Fixed; relaunch now logs `lowRam=false granted=false listener=unknown queue=0 gaps=0` with zero fatal exceptions.
- Device record captured in [14](14-ANDROID-COMPANION.md): API 28, `isLowRamDevice()=false`, WhatsApp 2.26.42.74, Chrome 138, Asia/Makassar. Listener grant **not** performed; no capture case exercised.
- Latest production assets: JS approximately **79.28 KiB gzip**, CSS **2.10 KiB gzip**; Worker dry-run approximately **82.55 KiB gzip**. These sizes are not a device performance guarantee.

Total: **41 automated tests passed**, plus native build/lint. CI includes these commands but has not been triggered on GitHub here. See [development instructions](18-DEVELOPMENT.md) for reproducible setup.

## Milestone truth

M0 remains **PARTIAL/BLOCKED**. Android 9 hardware, install, launch and low-RAM/metadata record are now evidenced; listener grant, capture filtering, queue durability, recovery and transport-on-device are still unverified, as are private remote networking, Cloudflare account and 9Router evidence. Native compilation is now verified. Later work is authorized independently; it does not sign off M0. M1 is locally exercised, not release-verified. M2–M4 are connected partial implementations. M5 remains conditional with only a local ICS parser.

## Remaining implementation and release gates

1. Latest real owner observations are VERIFICATION-LOG §17–19: in-place native install/launch/reopen and a complete clean crash window; notification access granted, listener connected/recovered, local TLS pairing over USB loopback, negative filter replay with queue zero. Those are historical owner observations, not checks performed by this builder. No positive capture has ever occurred. Complete positive capture, full lifecycle/metadata/filter/queue/restart/retention/interrupted-ack matrix, actual private networking and power/background tests. Do not widen the selector or automate permission grants from this brief. Preserve the existing signing identity.
2. Configure the owner's private network/receiver locally. No VPN/vendor/account choice or real peer pairing is claimed. Native task UI, localized resources, launcher icon and themes are implemented; signed update continuity, visual acceptance, real 200% layout, TalkBack and release packaging still require owner observations. Do not uninstall a signature-mismatched APK and lose a queue; rebuild with the existing local signing identity.
3. Verify actual named 9Router provider/route/privacy policy with synthetic input, positive consent and prompt-injection tests. Durable outbound jobs currently retry from UI; automatic Linux retry scheduling remains pending. Multi-source production credential management needs a dedicated operational interface.
4. Browser push subscription/revocation, empty-body VAPID dispatch and generic service-worker notification are implemented locally with synthetic tests. Real keys, browser/provider support, physical delivery, permission behavior, scheduler quotas and production D1 catch-up remain unverified. Durable inbox is independent and authoritative; provider acceptance is not device delivery. See RELEASE-GAPS.
5. Native Today, Tasks, detail, Review, Calendar, Settings, full editor and quick/date/proposal panels now use the real shared Worker handlers. Completion/add/edit/delete, explicit review/Undo, immutable online-request recovery, encrypted observations/drafts, source status and export are implemented. Local API/policy/compiler/browser results are in NATIVE-CHECKS and VERIFICATION-LOG §13. Native behavior, large-ledger performance, accessibility and owner acceptance remain unverified. Keep the PWA until native parity and owner acceptance; a passing browser suite is not a native UI test.
6. Implemented independent Linux control polling, durable phone phase journals, cloud per-device purge/receipt actions, PWA status polling/pagination and native source/action status pages. Queued/delivered/applied remain distinct; expiry/retirement never confirm. Known inventory remains explicitly incomplete. Actual phone interruption/reconnect, laptop-off recovery, relay trust, multi-source/manual-retain and backup tombstones remain unverified release gates. Run the control loop separately from AI jobs as documented in 15-PRIVATE-TRANSPORT.
7. Verify the new native path isolation and enrollment/activation/revoke/expiry on the actual account, plus owner-only production/preview Access policies, valid/invalid JWT paths, source revocation, application request budgets, Worker CPU and D1 limits in the actual account. Durable request accounting and last-reported health exist locally; they are not billing/CPU/account-quota enforcement. All production bindings remain placeholders; private APIs deny access when unconfigured.
8. Restore encrypted canonical data into disposable D1, verify future reminders, restored tombstones and revoked source reconciliation before sync. Current automated restore uses disposable SQLite.
9. Evaluate authorized ITK source access, finish cost/transport ADR and perform the seven-day owner pilot. Manual export import remains functional when listener collection is unavailable.

Existing tasks, proposals and in-app reminders do not depend on Linux/AI availability. Notification capture never claims complete WhatsApp coverage. No original group history, physical push delivery, production deployment or ITK integration is inferred from these checks.


## Historical hardware observation (§7) — 2026-11-06

Superseded for crash-coverage purposes by VERIFICATION-LOG hardware §8: later runs returned null because of the marker defect. No new hardware run is claimed by S2.

`scripts/device_evidence.py` ran against the owner's CPH2015 (API 28) with the APK built from `26d7719`.

Observed: `install_ok=true`, `launch_stays_open=true`, `reopen_ok=true`, `fatal_exception_observed=false`, `queue_count=0`, `repair_required=false`, `low_ram=false`, `notification_access=false`, `source_commit=26d77198…`, `apk_sha256=beecd4e4…`.

Independently cross-checked, not taken from the tool's own output: the APK hash matches `sha256sum` of the local build, the revision matches `git rev-parse HEAD`, and a separate `logcat` scan found 0 fatal exceptions.

`capture_matrix.py` was started against the phone and correctly refused to proceed without an owner present — it blocked at the first interactive prompt, left a 0-byte journal, and `--verify` rejected it as `Incomplete journal`. That is fail-closed behaviour, not a failure.

Still unproven: capture, filtering, queue durability, transport, key-loss recovery, backup exclusion. `smoke_result` remains `unverified` because process presence is not a smoke verdict.

## Focused-session environment and verification

Node 24.22.1, npm 11.9.0, Python 3.12.14, Java/compiler 17.0.20, Gradle 8.11.1, Kotlin 2.1.21, AGP 8.9.2. SDK platform 28 rev 6 / platform 35 rev 2, build-tools 35.0.0; Gradle downloaded platform-tools 37.0.1 without any device operation.

The resumed runtime had Java 17 compiler/tool modules but lacked executable launchers and SDK. Official Ubuntu JDK download returned HTTP 503; Adoptium API returned HTTP 403. Restored missing javac/jar/javap/jlink/jmod launchers against the existing standard JDK modules in a workspace-local runtime copy, then compiled and ran a Java probe. Explicit local Gradle toolchain settings select that copy; they are excluded from delivery. Official Android CLI tools 16.0 archive 12266719 passed its published SHA-1 check. Installed platforms 28/35 and build-tools 35.0.0 with sdkmanager; normalized the nested extracted platform roots after verifying source.properties API levels. None of these toolchain/cache files are in the repository ZIP.

Current captured results: npm ci exit 0; npm run check exit 0 (16 D1 tests plus formatting/types/PWA build/Worker dry-run); Python unittest exit 0 (19 tests); planning validation exit 0; Android assembleDebug/lint/testDebugUnitTest exit 0 with 0 lint errors and 6 existing warnings, including 5 plain-JVM policy tests and the whole-source API-28 check. Mutation checks completed: all 6 deliberately broken runs exited 1 for the intended reason; all 6 restored runs exited 0. Full actual output is in [SESSION-CHECKS](SESSION-CHECKS.md). Earlier browser E2E/PWA tests (5+1) were not rerun for this Android slice. Do not relabel the historical 41-test count as fresh browser/device proof.

Actual Android Keystore/SQLite/vendor behavior, changed APK install/launch, reset cancellation/interruption, listener grant/filter/queue/recovery, physical/private peer/network, account/provider/push tests and pilot remain unverified. Missing actual observation blocks those gates, not independent local checks. Run the one-minute smoke test on the owner's phone first. Build with the owner's existing local debug signing identity; no signing key/cloud-built APK is included.


## Acknowledgment and evidence follow-up — base 57947a3

Fresh clone, branch fix/action-acknowledgments. Scope F08/F21/F24 and device evidence tooling. No dependency, account changes, push/deployment or paid provisioning. Raw cloud and AI approval boundaries unchanged. Full actual command output and fault-injection results are in ACK-CHECKS.md.

Cloud migration 0004 adds device inventory/action metadata only. Phone purge/revocation and receipt cleanup explicitly report delivered and applied phases to authenticated Linux. Pausing/wiping/pending-raw-batch deletion must commit before application acknowledgment. Response loss retains retry journals/credentials; old clients without phases never certify application. Independent Linux control --watch checks every 30 seconds even without processing jobs. Cloud trusts source-scoped Linux relay attestations, not independent physical proof. PWA Sources refreshes every 15 seconds, displays per-action progress/status and supports history pagination. Unknown inventory is never claimed complete. Seven-day expiry and owner retirement label unresolved history only; late explicit acknowledgment can confirm. A permanently unavailable laptop leaves actions unresolved.

The local adb evidence command emits only projected fields with fresh per-launch tokens. It reports unavailable fields explicitly, never a blanket PASS for unrun capture/transport/key-loss/backup cases. Actual execution on the owner's phone is unverified. Launch probes can affect lifecycle experiments; use before/after sampling there. The earlier owner-recorded smoke remains historical, not this changed build's result.

Environment: Node 24.22.1, npm 11.9.0, Python 3.12.14, Java/compiler 17.0.20, Gradle 8.11.1, Kotlin 2.1.21 / AGP 8.9.2. Runtime lacked javac/jar launchers and SDK: restored standard module launchers in a private JDK runtime copy; official CLI-tools 16.0 archive 12266719 SHA-1 verified, sdkmanager installed platforms 28/35 and build-tools 35.0.0. Extracted nested platform roots normalized. Gradle installed platform-tools 37.0.1; no device operation was run. Toolchains/keys/caches excluded from delivery.

Actual phone install/launch/capture/Keystore/SQLite, network/account/provider/push behavior and pilot remain unverified. Web Push gate 4 is unchanged. No milestone is complete. Configure COLLECTOR_SOURCE_ID and existing scoped credentials locally and run the independent control process; no automatic claim that it is installed as an OS service. Future remote control kinds must implement the ledger before being exposed. Source/patch consistency is checked during packaging.

Final focused results: npm ci and npm run check exit 0 (18 D1 tests); Python unittest exit 0 (23 tests); planning validator exit 0; Android assembleDebug/lint/testDebugUnitTest exit 0 (6 JVM tests and API-28 surface check). Seven injected regressions failed for the intended assertion and passed after restoration: assumed cloud completion, assumed local application, fabricated evidence PASS, stale generation, receipt without durable commit, omitted no-job local purge, phone acknowledgment before durable writes. Full real output is in [ACK-CHECKS](ACK-CHECKS.md). A generated Gradle transform cache initially lacked metadata.bin; the two generated cache entries were removed, and the native fault-injection/restored/acceptance sequence rerun successfully. No warning was suppressed. Browser E2E/PWA tests were not rerun for this slice; new strings still need full locale/a11y/device review.

## Evidence integrity slice — base 43ddeea

Branch fix/trustworthy-device-evidence, fresh clone. User's explicit base 43ddeea supersedes c7c57c5 embedded in the brief. No capture has ever run on the phone; notification_access=false remains the last factual observation. No device/account/provider/network/push check is performed by this agent.

Added installed-APK readback identity, clean-build declared source provenance, observed install success and bounded live crash monitoring. Existing defect found: resumed activity detection accepted arbitrary dumpsys history; cold-stop success/process absence were also not checked. Both now fail closed. Warm resumes retain the owner's correction and require the same observed process or a fresh token, with bounded ColorOS retry. Early crashes cannot disappear behind a fixed log tail. Unknown stream/artifact/provenance stays null with unavailable fields listed.

The one-command matrix journal records actual begin/end intervals and strict passive observations, not editable PASS labels. Permission transitions alone can be automatically certified; other unprovable cases remain UNVERIFIED for owner review. HMAC sealing detects accidental edits/truncation but does not claim security against an owner/root with the local key. No extra dependency, cloud/raw-content path, approval change, rewrite or deployment was introduced. Actual capture matrix, new adb probe on hardware and vendor crash-log completeness remain unverified. No milestone is complete.

A mutation-run overlap during development exposed missing runner isolation. The shipped evidence fault runner now locks against concurrent runs, asserts failures are real test assertions and restores files in finally. Final suites and mutation checks are rerun sequentially; discarded overlapping-run output is not used as acceptance evidence. Full actual results are recorded in VERIFICATION-LOG and EVIDENCE-CHECKS.

Final evidence-slice outcomes: npm ci/check exit 0 (18 D1 tests), npm run test:e2e 5 passed, npm run test:pwa 1 passed, Python discovery 33 passed, Android build/lint/API-28/JVM checks pass (6 JVM tests), ten scripted faults fail then restore/pass with clean baselines. Both actual dirty-build null provenance and clean-build exact-revision asset checks passed locally. Full outputs are in [EVIDENCE-CHECKS](EVIDENCE-CHECKS.md); factual record updated in [VERIFICATION-LOG](VERIFICATION-LOG.md). Existing JDK 17 and SDK 28/35/build-tools 35.0.0 were reused, not newly provisioned. New adb/matrix tooling remains NOT RUN on hardware. No capture has ever run; notification_access=false is the last real observation.

## Pixel-paper design S1 — base 5ae9583, 2026-11-06

Owner attached UI-DESIGN-AGENT.md and app.html, then explicitly delegated conflict
resolution: “Refine it yourself”. ADR-021 adopts centered pixel-paper design while
preserving all workflows, server-confirmed success, date precision and privacy.
Scope W11/W41, F22 foundation; S1 only. The supplied design instruction §11 ends
each slice with an owner-review stop; this is not completion of the earlier full
product-polish brief or the whole app.

Implemented local fonts and licenses, bitmap/icons and Box/Chip/Tag/Button/exact
UrgencyBar primitives, theme preference responding to OS changes, four-tab shell,
quick-add FAB and retained secondary-page selector. `/__kit` is development-only;
no synthetic tasks enter production. Original reference is unchanged under
`docs/design/reference`. No dependency or backend/data/approval change.

Remaining: S2–S7 screen fidelity, routing/back/sheets, date grouping, swipe and
compensating undo, translations, full accessibility audit; Android launcher icon,
strings/theme/accessibility and fewer native lint warnings; large-ledger calendar
and server pagination. Existing native warnings are not suppressed or fixed by
this web-foundation slice. Do not reverse privacy, approval, generation, offline
write or server-ack safeguards to implement prototype interactions.

Last owner record still has notification_access=false and no listener event ever
received. No capture matrix was run here. Device/Android Chrome/TalkBack/account/
provider/real network/push and full accessibility compliance remain unverified.
No milestone complete. Acceptance commands and actual outputs for this S1 are
recorded in VERIFICATION-LOG and DESIGN-S1-CHECKS, including development failures
and subsequent restored checks where applicable.

S1 final outcomes: npm ci/check exit 0 (20 Vitest tests: 18 D1 + 2 foundation),
E2E 7 passed, compiled PWA offline 1 passed, Python 33 passed, planning validation
80 links / schemas/fixtures/rejections PASS. Four scripted faults each baseline
pass / broken assertion fail / restored pass. Android assembleDebug/lint/
testDebugUnitTest exit 0, API-28 surface compile and 6 JVM policy tests; lint still
0 errors / 4 warnings, so original warning-reduction acceptance remains unmet.
Node 24.22.1 / npm 11.9.0 / Python 3.12.14 / Java 17.0.20. Installed SDK platforms
28/35 + build-tools 35.0.0 after restoring private JDK module launchers and
selecting that runtime explicitly; Gradle 8.11.1 download used configured proxy.
Full command output and exact limitations: DESIGN-S1-CHECKS / VERIFICATION-LOG §8.


## S2 — read-only ledger and marker fix, base 6de38fd

Fresh clone, branch build/read-only-s2. Scope W11/W41 (F03/F15/F20/F22), plus
verified crash-monitor defect. S1 is owner accepted. S2 is the only new design
slice: do not begin S3 before owner review. New read-only surfaces, four distinct
precisions, owner-calendar grouping, actual policy/scoped history and preview
sheets are described in ADR-022 and 06-UI-UX. Existing legacy writers remain;
no optimistic updates/undo/new approval path, dependency or raw cloud data.

Removed logcat -T 1. The new process-boundary test exercises actual reader threads
with fake process streams that model the owner's measured flag failure. It can
prove the command/marker behavior under that model only. Latest hardware access
remains false; no listener event, capture matrix, device/account/provider/push or
actual private-peer network test was run here. The corrected monitor needs an
owner-run phone observation; historical null is not turned into false.

Read data stays bounded. New task-scoped history and its index avoid the existing
global last-100 cutoff; safe aliases and effective settings-based scheduler policy
are read in the same D1 transaction. Counts never infer a full ledger from a
partial page. Missing contexts are not guessed Personal, and no-date navigation
clears a restrictive prior filter. Offline detail labels the saved snapshot and
leaves unavailable history/policy explicit.

Still open: Android launcher identity/resources/theme and native accessibility;
full accessibility/real-screen-reader/Chrome 138 audit; large-ledger calendar and
server-query expansion; S3–S7 and all remaining release gates. No milestone
complete. Actual outputs and environment are recorded in S2-CHECKS and the
appended verification log, rather than inherited test totals. No push/deployment,
real chat data, account/provider access, paid provisioning or signing key delivered.


S2 final local outcomes: `npm ci`, `npm run check` (25 Vitest: 19 D1 + 2 foundation
+ 4 S2), `npm run test:e2e` (12), `npm run test:pwa` (1),
`.venv/bin/python scripts/validate_planning.py`, and
`.venv/bin/python -m unittest discover -s collectors/local/tests -v` (34) exit 0.
`cd apps/android-companion && ./gradlew assembleDebug lint testDebugUnitTest
--no-daemon` exits 0, including API-28 compile and 6 standalone JVM policy cases;
lint remains 0 errors / 4 warnings. Exact real output: [S2-CHECKS](S2-CHECKS.md).
The shipped `scripts/check_s2_mutations.py` runs 22 declared faults; every baseline
passes, every broken version fails an assertion and every restored version passes.

Node 24.22.1 / npm 11.9.0 / Python 3.12.14 / Java 17.0.20 / Gradle 8.11.1. Missing
SDK platforms 28/35/build-tools 35.0.0 were installed with official sdkmanager;
missing javac/jar-family launchers were restored via existing JDK modules in a
private runtime copy selected explicitly by Gradle. No project dependency added.

Do not reverse: unknown/approximate tasks stay under Tanpa tanggal even when done;
exact instants stay chronological across DST rollback; date-only never gets a
fabricated midnight; older-history failure must not erase known detail; informational
toasts must not block controls; auth-denied reads clear snapshots and counters.
The passing simulated tests do not supply the missing real phone observations.
Corrected crash-window hardware observation is BLOCKED; latest fatal field remains
null, notification access false, no capture/listener event ever. Relative countdowns
use browser time; no independently verified clock-skew correction is claimed.
S2 owner review is pending; stop here before S3. No milestone complete.


## S3–S7 implementation-only continuation — base 6de38fd, 2026-11-07

Fresh GitHub main clone at 6de38fd71f5237a7eda90307fe04ba47c69d922d; restored the
validated S2 patch/tree from Academic-OS-System-48255c5.zip, then worked on
build/s3-s7. S2 was not available as a remote commit and is included in the patch
against main. Checkpoint saved during implementation. No GitHub push/deployment,
paid provisioning, new dependency, real-data import or account/device operation.

The owner explicitly authorized all S3–S7 together, then requested no tests and
reserved verification for another agent. See ADR-023. Implementation scope W11/
W31/W41, F03/F04/F13/F14/F20/F22/F23/F24; native Android/collector were preserved.
No milestone is complete. Build commands and actual output are in BUILD-S3-S7;
verification-agent instructions and remaining observations are in S3-S7-HANDOFF.

Implemented: completion/reopen, manual add, precision-preserving date/full edit/
delete, versioned history and idempotent retries; durable explicit-online-request
journal with no reconnect sends; pending visual completion separate from canonical
group/count state; review stack/swipe/buttons/keys, active evidence IDs, explicit
conflict target search, edited approval and compensating Undo; month/query cursor
navigation and partial disclosures; local UI preferences, owner timezone, existing
reminder controls, structured export/Linux backup instructions and explicit purge
preview; owner-scoped offline observations, hash-matched public PWA shell, maskable
icons and optional motion/haptics. No sample data added to production paths.

Preserve these decisions: owner approval before AI mutation; exact/date-only/
approximate/unknown remain distinct; uncertain writes retain immutable same-key
retry; Undo cannot overwrite later edits or a purged generation and inverse data
is excluded from backups; cache missing is unavailable; raw data never enters
cloud/PWA storage; phone/Linux acknowledgments remain independent from cloud
success. Source purge disables inverse restoration and scrubs affected structured
history payloads. No hidden auto-accept, offline write queue or push promise.

Actual environment: Node v24.22.1, npm11.9.0, Python3.12.14. Installed existing
lockfile dependencies with npm ci --ignore-scripts (no new dependency). Vite and
Worker dry-run compile; TypeScript emits no diagnostics. No Java/Android SDK was
installed or used for this web-only continuation. Native source unchanged.

Verified by a later agent on this tree (base 6de38fd): npm run check exit 0
(prettier, tsc, Vitest 25/25, Vite + Worker build), npm run test:e2e 12 passed,
mutation suite PASS 22/22 broken-assertion failures with 22 restored passes and 0
survivors, Python discovery 34 OK, planning validation PASS. Running the suites
found six real UI/a11y defects and two unsound mutation cases; all are fixed here.
Full commands, outputs and exclusions are in VERIFICATION-LOG section 11.

NOT re-run on this tree: npm run test:pwa and Gradle assembleDebug/lint/JVM. The
Android app source is byte-identical to 6de38fd, so the Gradle result at section 7
is not contradicted, but it was not re-established here. Migration 0006 application
remains unverified.

Unverified: all new runtime behavior and migration application, real capture and
private transport/reconnect, Android Chrome138/TalkBack, physical Web Push,
provider/account/production D1/Access, visual review and accessibility compliance.
notification_access=false remains the last observation; no listener event or
capture has ever run. Android identity/resources/theme, native accessibility,
production large-ledger performance and all other earlier release gates remain
outstanding.

Device smoke DID run on real hardware on 2026-11-07: OPPO CPH2015, API 28,
build d748479. install_ok, launch_stays_open and reopen_ok are true; the pulled
installed APK hash matches the built one; fatal_exception_observed is false and
was cross-checked independently (the only crash block in the buffer names
com.coloros.mcs, not this package). This is the one-minute smoke in
DEVICE-SMOKE, not the capture matrix: because notification access is still not
granted, no listener event has ever been received, so capture, filtering, queue
durability, retention, restart survival and interrupted-ack recovery remain
unverified. A debug APK was built and installed for this run. Full record:
[VERIFICATION-LOG](VERIFICATION-LOG.md) section 12.


## Native implementation — base 6bbfa26, 2026-11-08

Fresh main clone verified `6bbfa26 docs: add the native migration plan and the
implementation brief`. Work is on build/native-android. A workspace restart
removed the first local build directory. The durable INPROGRESS checkpoint was
restored, subsequent fixes reconstructed, and checks rerun. Only retained outputs
for this recovered tree are counted below. No push, deployment, paid provision,
real data, account, provider or device test was performed.

Implements the accepted A/B/C: migration 0007 with expiring/revocable hashed
per-install credentials; pending enrollment plus explicit full-fingerprint
activation; `/api/device/v1/*` with no Origin/ambient credentials and an explicit
route/method allowlist; unchanged browser same-origin guard; shared canonical
handlers; platform Views and no new dependency. The generated app R.jar was
required by the standalone API-28 compiler. Its API-28 stubs/no-JDK flags and
all-source coverage remain, with an added source-inventory assertion.

All eight native surfaces and Capture entry are reachable in the implementation.
The separate task store encrypts credentials, observations, drafts and immutable
request journals. A durable receipt atomically removes journal/editing form and
invalidates views. Reconnect only reads; retries are explicit and use the same
body/version/key. Auth loss retains a non-content uncertainty warning before
clearing sensitive ledger data. Raw queue, transport, capture service and their
keys are preserved. No notification access is granted by enrollment.

Do not silently reverse: explicit confirm-button approval, no swipe/key/date/draft
approval; four precisions, including completed unknown/approximate tasks in
Tanpa tanggal; owner-clock countdowns are estimates; stale generations and CAS
remain server-authoritative; missing encryption key over ciphertext requires
owner repair; no assumed success on timeout; no automatic reconnect write;
queued/delivered/applied/expired/retired-unconfirmed are different; no credential
metadata in canonical backups/exports; PWA retirement requires owner acceptance.

Code contact findings: original context/source creation and reminder-policy
updates lacked recoverable receipts, so shared handlers gained idempotency
support. Existing snooze validation rejected a committed retry once its requested
time passed; receipt replay now precedes temporal validation. Native draft and
journal cleanup share a transaction to avoid duplicate quick-add after process
death. Native committing swipes from the old web prototype were deliberately
replaced by guidance plus explicit approval confirmation, per the latest brief.

Actual commands/output, toolchain setup, failures and final outcomes are in
[NATIVE-CHECKS](NATIVE-CHECKS.md) and [VERIFICATION-LOG](VERIFICATION-LOG.md) §13.
Follow [NATIVE-OWNER-RUN](NATIVE-OWNER-RUN.md) for signing, account enrollment and
all eight owner acceptance paths. M0 remains PARTIAL/BLOCKED; no milestone is
complete. Actual capture, phone storage/Keystore, runtime recovery, private
network, account/provider/push and native accessibility remain unverified.

Retained local outcomes for this native handoff: `npm ci --ignore-scripts` exit0;
`npm run check` exit0 with36 Vitest; `npm run test:e2e` exit0 with12 PWA tests;
`npm run test:pwa` exit0 with1 PWA offline test; `.venv/bin/python -m unittest
discover -s collectors/local/tests -v` exit0 with40; `.venv/bin/python
scripts/validate_planning.py` exit0 (planning only); `.venv/bin/python
scripts/check_placeholders.py` exit0. `./gradlew clean assembleDebug lint
testDebugUnitTest verifyApi28` with the explicit Java properties in §13 exits0
in43s on isolated code d2f24e4; lint0errors/2existing warnings, 6QueuePrivacy and
5NativePolicy standalone JVM cases. The shipped native mutation script exits0
with10 intended failures and10 restored passes. Actual complete outputs ship in
docs/native-checks. Node24.22.1/npm11.9.0/Python3.12.14/OpenJDK17.0.20;
Gradle8.11.1/Kotlin2.1.21/AGP8.9.2; SDK platforms28/35 and build-tools35.0.0.
These are local/synthetic results. All native runtime/device/account gates above
remain unverified; none is silently converted to complete.

## Owner-run evidence preparation — base e7417ce, 2026-11-08

The native implementation and §14 independent local verification are preserved.
This follow-up adds owner-local certificate/package checks before install-r,
refuses mismatched/unknown/retained-data states, and provides a terminal-only
sanitized recorder. Crash markers must match the exact log protocol; ambiguous
PID reuse cannot manufacture an app crash. Separate window-start/end/complete
fields distinguish unobserved coverage from an observed clean interval. No
uninstall, clear-data, permission grant or automatic account action is performed.

Actual local checks: Python discovery66 pass; owner-safety mutations7 intended
failures/7 restored passes/0 survivors; existing evidence mutations10 broken/
10 restored passes; planning/placeholder checks pass. Full output and limits:
[VERIFICATION-LOG §15](VERIFICATION-LOG.md#15-owner-signing-and-device-evidence-preparation--base-e7417ce-2026-11-08).
No app rebuild, npm/browser/Gradle rerun, real apksigner/device/account/provider/
push test was performed. Android, Worker and PWA source/build files are unchanged.

Use [the short owner procedure](OWNER-DEVICE-SESSION.md) and return only its JSON.
Real signing compatibility, install, native launch/usability, credential lifecycle,
Cloudflare path isolation and capture remain unverified. No new native hardware
result exists. Notification access is last recorded false; no capture/listener
event has ever occurred. M0 and all other release gates remain incomplete.

## Independent re-verification of `ebfb6ca` — 2026-11-08

The newest delivered archive was applied onto a clean base `e7417ce` as commit
`6db80bf`; its tree hash equals the archive's declared tree
(`e2694f2f…500d`). Every suite that `APPLY.md` listed as NOT RUN for that
checkpoint was run here, plus the ones it did list:

Python discovery 66 pass; owner-safety mutations 7/7 broken and restored;
evidence mutations 10/10; S2 mutations 22/22 broken assertion failures and 22
restored passes; planning validation and placeholder scan pass. Node: typecheck
clean, Prettier clean, 36 Vitest pass, web+worker build (wrangler dry-run) exit
0, 12 Playwright e2e pass, 1 production-PWA offline test pass. Android with
jdk-17.0.21+9 and SDK 35: `testDebugUnitTest lint` BUILD SUCCESSFUL in 3m46s.

Real `apksigner`/`aapt` output was fed through the new `apk_safety` code: the
locally built debug APK reports cert `f4569691…` and `candidate_ephemeral:
false`; the delivered debug APK reports `3b761748…6e3838` and
`candidate_ephemeral: true`, so the pinned ephemeral constant is correct. With
no phone attached both stop at `PACKAGE_STATE_UNVERIFIED` and
`owner_device_run.py --preflight` exits 2 `DEVICE_NOT_IDENTIFIED` — fail-closed,
not a pass.

One real defect fixed: `device_evidence.collect` assigned `safe['unavailable']`
twice, making the in-`finally` value dead. Duplicate removed; all suites re-run
afterwards. Exact output: [VERIFICATION-LOG §16](VERIFICATION-LOG.md#16-independent-re-verification-of-ebfb6ca-on-the-owner-machine--2026-11-08).

Still unverified: signing compatibility with the installed app, install,
readback, launch, native usability, capture, credential lifecycle, Cloudflare
path isolation, provider/push. No APK was rebuilt for the phone and no key was
touched. Notification access remains last recorded false; no listener event has
ever occurred. M0 and all other release gates remain incomplete.

## First real run of the native APK — CPH2015/API 28, 2026-11-09

The owner connected the phone. Before the update it held `0.1-probe`
(versionCode 1, commit `d748479`); the read-only signing preflight returned
`allowed: true`, `signature_match: true`, so an in-place update was permitted.
`install_ok: true`; the phone now runs `0.2-native-preview` (commit `44a9a50`,
sha `2388355d…`) with `firstInstallTime` unchanged, `capture.db` intact and a new
`owner-ledger.db` — no data reset, no permission granted.

Launch, reopen, queue count 0 and no repair prompt are evidenced on real
hardware. Notification access is still **false** and no listener event has ever
occurred.

One real defect was found by this run and fixed. The crash monitor treated any
`I/chatty` line as lost coverage, but ColorOS continuously suppresses
`InputDispatcher` and GMS lines, so `crash_coverage_complete` could never be
true on this device and every run would have been reported unverified. The rule
now attributes suppression to its owner: only our own package's monitored tags
count as lost evidence, and unparsable or unnamed self-suppression stays
fail-closed. After the fix the same device reports
`crash_coverage_complete: true` with `fatal_exception_observed: false` — the
first clean-window negative on the new app.

Exact output: [VERIFICATION-LOG §17](VERIFICATION-LOG.md#17-first-real-run-of-the-native-apk--cph2015--api-28-2026-11-09).

Still unverified: capture, filtering, queue durability, restart survival,
interrupted-ack recovery, transport, enrollment/activation/revocation, cloud
path isolation, provider and push. `smoke_result` remains `unverified` until the
interactive owner session runs. M0 and all release gates remain incomplete.

## Live listener, pairing and filter check — CPH2015/API 28, 2026-11-09

Driven from the terminal at the owner's instruction. The listener was enabled
with `cmd notification allow_listener` — a real OS permission transition, not a
bypass — and recorded as an owner-authorised deviation from the tap-in-Settings
procedure. **This is the first time the listener connected on any device**
(`health.xml` → `listener=connected`), and it reconnected on its own after a
deliberate disconnect/reconnect cycle.

The phone paired with a local TLS receiver over `adb reverse`. Receiver-side
state is `devices 1`, `nonces 5`, `receipts 0`, `evidence 0`; nonces are
HMAC-verified requests, so TLS, certificate pinning, hostname checks and
per-request signing all completed on real hardware. This is USB loopback, **not**
the private-network transport: VPN/private-address, laptop-off queueing and
receipt-after-commit remain unverified.

Filter check (negative half of T09): with a synthetic non-matching mapping
enabled and 28 individual `com.whatsapp` notifications active, a listener cycle
replayed them through `capture()` and `queue_count` stayed 0 with
`observed_gap_count` 0 — unselected conversations were not persisted.

Not observed: any captured notification. `capture` and `transport` remain
`not_run`. The positive path needs an owner-controlled WhatsApp self-chat
message; it was not fabricated, and no real conversation was mapped because that
would persist real message text.

Exact record: [VERIFICATION-LOG §18](VERIFICATION-LOG.md#18-live-listener-pairing-and-filter-check-on-the-cph2015--2026-11-09).
M0 and all release gates remain incomplete.

### Selector defects found while attempting the positive capture test

Two measured defects in `CaptureService.capture`, neither worked around by
widening the filter:

1. **Exact title equality cannot survive a live conversation.** The filter
   requires `title == expected`, but 6 of 8 individual WhatsApp notifications on
   this device embedded `(N messages)` or a `: preview` suffix — the title mutates
   per message. `conversationTitle` was present for 6 of 8 and differed from
   `title` in 6 of 6 comparable cases. A verified title will not match the next
   notification in the same conversation.
2. **The group-key half of the conjunction is inert.** All 8 notifications shared
   one `groupKey` and none was a group conversation, so "title AND group key"
   degenerates to title-only — not the owner-tested conjunction the code claims.

Applied on branch `fix/capture-conversation-title` after the owner's decision.
`CaptureMatch` prefers `EXTRA_CONVERSATION_TITLE`, strips only the mutating
`(N messages)` counter, and requires exact equality on identity and group key.
It deliberately does **not** truncate at `": "`, so a chat named `Ana: Maria`
cannot collapse onto a verified `Ana`. A title whose preview text mutates fails
to match, which is the fail-closed direction. See [VERIFICATION-LOG §19](VERIFICATION-LOG.md#19-capture-selector-fix-listener-crash-and-reboot-persistence--2026-11-09).

The positive capture test was not executed. The owner chose the existing
self-chat, but no self-chat notification was present: 0 of 8 titles matched a
self label, 0 of 6 comparable blocks had sender == conversation name, and 0 of 2
blocks without `conversationTitle` had `title == MessagingStyle.user`. Mapping any
of the 8 would have persisted another person's message text, so it was not done.
One owner-controlled WhatsApp self-chat message still completes the gate; the
receiver, tunnel and pairing were left running for it.

## Capture selector fix, listener crash and reboot persistence — 2026-11-09

Branch `fix/capture-conversation-title`. All three changes came from real-device
observation:

1. **Selector** — `capture()` required an exact `EXTRA_TITLE` match, but live
   WhatsApp titles carry `(N messages)` and `: preview`, so a verified mapping
   never matched. New platform-free `CaptureMatch` takes
   `EXTRA_CONVERSATION_TITLE` when present, else `EXTRA_TITLE`, strips only the
   mutating `(N messages)` counter, and requires exact equality on identity and
   group key. It deliberately does **not** truncate at `": "`: a chat named
   `Ana: Maria` would otherwise collapse onto a verified `Ana`. Mutation-preview
   titles therefore fail to match, which is the fail-closed direction.
   `describeActive()` renders the same value the filter compares.
2. **Install crash** — the first fixed build crashed once on install. After an
   in-place update the system re-binds the listener before re-authorising it, so
   `activeNotifications` threw `SecurityException` and killed the process. Now
   guarded by `safeActive()`, which records `listener_denied` and returns an
   empty list; new notifications still arrive via `onNotificationPosted`. Config
   survived the crash intact.
3. **Reboot gap** — `SyncJob` was not persisted, so periodic transfer stopped
   after a reboot until the Capture screen was opened. Added
   `RECEIVE_BOOT_COMPLETED` and `setPersisted(true)`.

The Capture screen also now shows the existing pairing instead of blank fields
that made one-time setup look per-launch.

Verification: `assembleDebug lint testDebugUnitTest` BUILD SUCCESSFUL in 6m16s on
JDK 17.0.21+9 / SDK 35; 8 native-policy cases and 6 queue-privacy cases pass,
including three new selector cases. Mutation proof restores the pre-fix
comparison and the run fails at `capture selector needs exact identity and exact
group` with an assertion, not a compile error; sources are restored afterwards.
APK `a3bd5b12…` is signed with the installed debug identity, so the next update is
in place.

The guarded APK was then installed in place once. Preflight returned
`allowed: true` / `signature_match: true`, `install_ok: true`, and the crash
buffer for this package stayed at **1 before, 1 after** — the same 08:37 event,
no new fatal, where the previous build crashed at exactly that point. A fresh
window straight afterwards reported `crash_coverage_complete: true` with
`fatal_exception_observed: false`. The installation run itself reports coverage
incomplete, because replacing the process inside the window is a disrupted
interval, not a clean one.

Configuration survived: the synthetic mapping is still `enabled=true`, one sealed
pairing `config` remains, and the listener is `connected` after rebind.

**Not run:** the positive capture test — no notification has ever been captured
and it needs one owner-controlled WhatsApp self-chat message. Capture and
transport remain `not_run`. M0 and every release gate remain incomplete.


## Release gaps implementation — base c4497da, 2026-11-09

Branch build/release-gaps; W40 then W41/W42, F15/F16/F19/F21/F25, preserving
F01/F13/F24/F30. Read NEXT-PROMPT Part2 and required contracts before coding.
No redesign, new dependency, capture change, auth/Origin exception, signing-key
change, push/deploy/provisioning or account/device action.

Migration0008 adds revocable browser push endpoints, unique external attempt
journals and durable application counts/cron reports. Empty-body VAPID wake-ups
open a fixed generic same-origin inbox notification; existing jose/WebCrypto
suffice. Rich payloads were rejected because no task content is needed at the
provider. Unknown sends are not retried or called success; inbox contents/counts
are independent. Unconfigured/invalid keys keep the inbox usable. Details and
owner setup/remaining observations: [RELEASE-GAPS](RELEASE-GAPS.md).

Inspection contradicted the brief's claim that PWA Tasks and Calendar filter only
client-side: both already call the server. Retained those paths. Filter-bound
opaque task cursors now reject reuse across filters; a secondary client filter
no longer reinterprets remote results. Month-page failures retain loaded rows.
Global history is paged through both namespaces and both clients. Native search,
scoped detail history and export already existed; added only global history
paging and source last-report health. Actual native usability remains unverified.

Application budgets use atomic D1 counts across restarts, with fixed 429/503 codes.
They do not measure or cap billing, CPU, D1 rows or unauthenticated traffic.
Missing/stale/future/failed reports stay distinct from recent successful reports.
Counts and reports are excluded from canonical backup/restore with credentials
and push endpoints. Do not silently replace these with isolate counters or a
fake healthy default. Existing task/AI idempotency and explicit approval stay.

Actual acceptance output and environment are recorded in [RELEASE-GAPS-CHECKS](RELEASE-GAPS-CHECKS.md)
and VERIFICATION-LOG §20, with full logs and broken/restored fault runs. All data
is synthetic. No milestone or release gate is complete. Positive capture,
private-network transport, account enrollment/Access, actual push, provider,
production migration/restore/quota, real accessibility and owner pilot remain
unverified. Native changes must be rebuilt with the owner's existing signing
identity and run on the actual phone after review; never uninstall/clear to fix
a mismatch. No APK signed with this workspace's debug identity is delivered.

Local acceptance outcome for this slice: npm ci/check exit0 (52 Vitest), Python70
pass, production PWA1 pass, Gradle assemble/lint/API28/JVM exit0 (14 JVM; lint0
errors/2 unchanged Transport warnings),16 intended fault failures/restored passes.
Latest full browser run:14 passed/1 design-kit 200% layout failure; isolated retry1
passed, earlier full run15 passed. This flake remains unresolved, not a green
latest suite. No device/account/push result is claimed. Full actual output: §20.

## Independent verification of the release-gap package — 2026-11-09

`Academic-OS-System-2b88131.zip` applied to `c4497da` reproduces its declared tree
`e5f36ec1…` exactly. Verified here: 52 Vitest, 15 Playwright e2e, 1 production PWA,
70 Python, Gradle `assembleDebug lint testDebugUnitTest` green in 8m13s (8
native-policy + 6 queue-privacy), planning/placeholder scans, and the new
`check_release_mutations.py` at 16 intended failures / 16 restored, run twice.

One real defect in the package was found and fixed: the 1200-row scale test
carried a 20s override, measured at 18.2s alone and 38s under full-suite load, so
`npm run check` failed intermittently. Raised to 120s with the measurement in a
comment; assertions unchanged. Exact record: [VERIFICATION-LOG §21](VERIFICATION-LOG.md#21-independent-verification-of-2b88131-on-the-owner-machine--2026-11-09).

The rebuilt APK (`bc4bd4a2…`, cert `f4569691…`, same signing identity) was **not**
installed: the phone left USB first. No new device claim is made. Positive
notification capture, private-network transport, account enrollment, real push
delivery, provider, production migration/restore and the owner pilot remain
unverified. No milestone is complete.


## CSV, adversarial boundaries and resource evidence — base af1879b, 2026-11-09

Fresh main at af1879bfb561774e6eca20a6f9d4c7cffa0ae83b; branch
build/export-boundaries. NEXT-PROMPT exists; no older checkout. W42/F23/T30,
then W30/W31/F12–F14/T18–T20, then W00/W42/F25/T33. No dependency, migration,
Android source, signing configuration, capture-selector, approval or Origin change.

Complete the advertised export format through one canonical snapshot and the
unchanged11-table allowlist, now shared by Worker and Linux backup. One rectangular
CSV uses table/qualified-column headers, quoted UTF-8/CRLF cells and apostrophe
neutralisation before quoting. JSON remains the lossless backup/restore format;
PWA lets the owner choose explicitly. Invalid formats fail rather than becoming
JSON. Same authentication/budget before reads; no wider table export.

A seven-case hostile-source corpus and adversarial model-output cases exercise
real consent, JSON/schema, evidence subset, no-tools and proposal-only boundaries.
A verified gap was found: contact redaction left common secret-shaped source
values in provider JSON. Local known-pattern redaction now precedes contact/date
handling. This is a heuristic, not universal secret detection; preview/explicit
provider consent remain necessary. SYSTEM/schema/approval were not weakened.
Two-source formal/group disagreement stays pending until an explicit owner choice;
stale target versions fail, competing claims persist and reminder revisions change
only after review. Reject/clarify audit without canonical creation is now asserted.

T18/T19/T20/T30/T33 now map to exact assertions and remaining gaps in
[11-TEST-STRATEGY](11-TEST-STRATEGY.md). All11 canonical tables have nonempty local
restore fixtures with independent counts/hashes and no restored credentials,
push state or old dispatch. Production D1 restore remains unverified.

[RESOURCE-BUDGETS](RESOURCE-BUDGETS.md) and its retained JSON record actual production
bytes/gzip, local query plans/wall samples, controller RSS and current request
classes. Task list/search/calendar still scan/sort despite bounded result pages;
history cursor uses rowid lookup. These are documented limits, not a new scaling
claim. Worker CPU, production row costs, mobile/phone timings and parser peak RSS
remain unmeasured. Proposed ceilings need owner/account review; they do not cap
billing or authorize spending. No automatic limit increase or index rewrite.

Exact commands/results and setup are appended in VERIFICATION-LOG §22 and
contract-checks. No owner device/account/provider/push/deployment result is
claimed. Positive capture is still unobserved in the inherited record; keep the
actual §17–21 observations and their limits. No milestone is complete.

Local outcomes: npm ci/check exit0 (58 Vitest), browser16 pass, production-PWA1
pass, Python80 pass, new fault proofs14/14 and inherited release proofs16/16 with
0 survivors; Gradle assemble/lint/API28/JVM exit0 (14 JVM,0 lint errors/2 inherited
warnings). These are synthetic/local checks only. Exact output and limitations: §22.

## Independent verification of the canonical-export package — 2026-11-09

`Academic-OS-System-4f75f3a.zip` applied to `af1879b` reproduces its declared tree
`574ee405…` exactly. Verified here: 58 Vitest, 16 Playwright, 1 production PWA,
80 Python, planning (150 links) and placeholder scans, Gradle
`assembleDebug lint testDebugUnitTest` green in 5m44s (8 native-policy + 6
queue-privacy), and both fault suites at 14/14 and 16/16 with zero survivors.

Android source is byte-identical to `af1879b`, so the APK was not reinstalled. The
phone stayed on `0.2-native-preview`, crash count 1, listener connected, mapping
enabled, pairing sealed.

One defect in the delivered package was found and fixed: the durable-budget test
fired 120 concurrent `db.batch()` calls, and Miniflare's D1 RPC layer asserts
under that load. `account()` converts every non-budget failure into
`BUDGET_ACCOUNTING_UNAVAILABLE`, so the harness limit looked like a budget
refusal. Measured 2 failures in 6 runs here and 2 in 6 at the pre-patch base
`af1879b` — inherited, not introduced. Concurrency is now bounded to eight:
0 failures in 8 runs, and the `budget-cap` mutation still fails the test. Exact
record: [VERIFICATION-LOG §23](VERIFICATION-LOG.md#23-independent-verification-of-4f75f3a-on-the-owner-machine--2026-11-09).

The CSV contract is real: `format=json|csv`, 422 on unknown formats, one shared
eleven-table allowlist with the Python backup, `= + - @ TAB CR` neutralised before
RFC 4180 quoting, credentials and push/operational tables asserted absent. The
reported redaction leak is fixed; pattern redaction remains a heuristic and is
documented as one.

Not verified: any real provider call, physical push delivery, private networking,
positive notification capture, production D1 restore/CPU/row costs, native UI and
accessibility acceptance, the pilot. No milestone is complete.
