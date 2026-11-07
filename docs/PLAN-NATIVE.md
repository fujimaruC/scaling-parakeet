# Native Android migration plan

**Decision plan · 2026-11-07, Asia/Makassar · base `bd70562`.**

Build the daily product inside the existing Android application. Keep Worker/D1
as canonical memory and Linux as the raw-data processor. This is a substantial
UI port, not a theme applied to the capture probe.

| Decision | Chosen approach | Consequence |
|---|---|---|
| A — Native authentication | A separately enrolled, expiring, revocable owner-device credential. Store only its hash in D1. | Requires Worker authentication, enrollment/revocation and migration `0007` work. None exists yet. |
| B — Browser Origin protection | A separate device API namespace. It requires the device credential and rejects browser Origin headers. Keep the browser API's existing Origin rule. | Reuse domain handlers. Do not exempt a request merely because Origin is absent. Cloudflare routing must be proven first. |
| C — Native UI toolkit | Platform Android Views. Keep the complete `verifyApi28` check. | No Compose plugin or new UI dependency. Build reusable native components so Views do not mean a bare probe UI. |
| React PWA | Delete it **after native parity and owner acceptance**, not at migration start. | The laptop loses its canonical task-management UI. Keep Linux import/evidence/AI tools and a small protected device-administration page. |

These are architecture choices for future implementation. Only this document is
changed in this session. No application code, dependency, deployment or new
verification result is supplied. No milestone is complete.

## 1. What this plan can rely on

`git log --oneline -1` in a fresh main clone returned:

```text
bd70562 docs: replace the next brief with the native migration plan prompt
```

The required files were read in the requested order. Extra context came from the
manifest, Worker configuration, queue/transport, implementation packages and
[VERIFICATION-LOG](VERIFICATION-LOG.md) sections 11–12.

The warning in [owner decisions](16-OWNER-DECISIONS.md) matters. Its table is not
independent evidence of owner consent. The present brief confirms native Android,
one owner, both responsibility domains, privacy, explicit approval and continued
dual ingestion. Other table entries remain design notes unless separately
confirmed. In particular, do not treat an old “native task UI is out of scope”
line as current direction, or invent a transport/provider/spending choice.

The latest recorded hardware smoke is **2026-11-07**, build `d748479`, on the
OPPO CPH2015/API 28. Install, launch and reopen were recorded true, installed APK
hash matched, and no app fatal exception was observed in that window. Older
paragraphs in STATUS still describe earlier null crash coverage. Section 12 is
the newer record; neither record is a test performed by this architecture agent.

**Notification access is false. No listener event or capture has ever occurred.**
The capture matrix is unverified. A new native task UI cannot close that gate.

The current Worker validates an Access JWT's signature, issuer, audience and
owner subject. The collector has separate source-scoped authentication. The
Origin check follows owner authorization near index.ts line 716. Native
`HttpsURLConnection` requests cannot currently use the task API unaided.

## 2. A — Give the phone its own owner credential

### The decision and its limits

Use a high-entropy opaque credential, not a new homemade JWT issuer. It belongs
to the existing `OWNER_SUB`, not to a source or a second user. Each installed
client gets its own credential. This is owner-controlled device enrollment,
not registration.

Proposed defaults are a 256-bit random device secret, a five-minute enrollment
grant, and a 90-day device-credential lifetime. These are engineering defaults,
not previously confirmed owner preferences. Warn before expiry. Re-enrollment
must work without the old phone. There is no silent indefinite refresh token.

The credential permits daily owner actions: tasks, contexts, proposals/review/
Undo, calendar queries, reminders, settings, sources/purge/status and structured
export. Use a server-side allowlist of the actual routes and methods. It cannot
mint collector credentials, enroll more owner devices, change owner identity, or
call `/sync*`. Sensitive enrollment and credential administration remain behind
verified Access. The phone may revoke **itself**. Adding a future API must not
silently add it to the device's authority.

This protects against unauthenticated access, guessed identity headers, leaked
D1 credential rows and a copied encrypted app-data directory. It does not protect
against an unlocked or compromised phone acting with the owner's credential.
Within its scope, that attacker can read/export tasks, approve proposals and
purge sources. A confirmation dialog is useful against mistakes, not malware.
It also does not prevent denial of service or undo data already exfiltrated.

### Enrollment, storage and recovery

All endpoint names below are **proposed**, not existing APIs.

1. The phone creates a random client ID and secret. It durably encrypts them
   before sending an enrollment request. Show a credential fingerprint for the
   owner to compare. This is a hash of a random credential, never of a message.
2. On a trusted browser, the owner signs in through existing Access. A small
   protected device-administration page creates a random, single-use enrollment
   grant for this owner. Display it once. It expires after five minutes. Do not
   put grants or credentials in URLs, clipboard workflows, logs or screenshots.
3. The owner enters the grant on the phone. The phone sends its client ID,
   chosen secret and grant over verified HTTPS. The Worker stores hashes and a
   **pending** device record. No task access is permitted yet.
4. The owner compares the phone and browser fingerprints and explicitly
   activates that pending device. A stolen grant alone must not activate an
   attacker's different credential. Pending devices expire with their grant.
5. Activation starts the proposed 90-day lifetime. The phone checks `/me` with
   its credential, then opens the real ledger. Enrollment never grants
   notification access or enables capture.

Consume the grant and create its device record in one guarded D1 transaction.
A lost response must be recoverable by retrying the **same** grant, client ID and
secret. An already-consumed grant may acknowledge that exact pending enrollment;
it must not enroll a different secret. After expiry, cancel and restart through
Access. An existing active credential cannot be replaced by enrollment replay.

Proposed `0007` adds owner-client credentials and short-lived enrollment grants.
Record client ID, owner subject, secret hash, fixed scope/version, status,
created/expiry/revocation times and safe device label. Grants store only a hash,
expiry, consumption link and bounded attempt state. Do not reuse
`capture_devices` or `collector_credentials`. Their authority is different.
Exclude these new authentication tables from canonical exports and backups.
Restores create no enrolled clients. Credentials must also remain absent from
HTTP diagnostics and error responses.

On each request, look up the device, verify the random secret's hash, confirm
active/not expired/not revoked, and require its subject to equal configured
`OWNER_SUB`. Fail closed when configuration is missing. Ignore caller-supplied
owner identities. Use standard cryptographic randomness and SHA-256 for random
secret verification. This is not hashing raw source content or a human password.
Bound enrollment size, attempts and polling. Return generic failures. Do not
cache positive authentication across requests. Use primary-consistent D1 reads
for credential checks; the current direct DB API uses the primary, while a future
Sessions implementation must start the auth query with `first-primary` [E2].

Android stores the credential and structured cache encrypted under a dedicated
Keystore key, separate from queue/pairing keys. Keep backup/transfer exclusions
and `FLAG_SECURE`. Require a configured screen lock before enrollment. Do not
assume this OPPO has hardware-backed protection: **unverified**. A storage copy
without the key should not decrypt; a compromised live process may use keys and
recover the bearer secret [E3]. Once stolen, the bearer is replayable until
revoked/expired. Keystore encryption is not proof-of-possession authentication.

Revoke a lost device from Access on a different trusted browser. Recheck status
on every request. Revocation stops new authorized requests after it commits;
an already accepted request may still finish. Authentication failure clears the
phone's credential, task cache and task-write journal. This does not roll back
an earlier committed request. If its acknowledgment was lost, warn that its
outcome is unknown and refresh canonical state before an owner creates a
replacement; never automatically replay a cleared journal. Offline revocation cannot
remotely erase an offline snapshot: label it stale/read-only, protect it locally,
and clear it on the next authenticated denial. Logout never wipes raw capture
queues or Linux pairing as a side effect. A missing credential/cache key requires
re-enrollment, not silent key regeneration over ciphertext.

### Rejected alternatives

- **Copy the browser Access JWT into the app:** rejected as the durable login.
  It expires according to configured Access sessions. The repo has no native
  renewal/callback flow. Cookie/JWT extraction adds a fragile secret-transfer
  path and does not solve recovery. The browser is used for enrollment, not as
  a token vault for Kotlin.
- **OIDC device authorization flow:** a reasonable later option if an actual
  configured provider supports it. No such provider/flow is evidenced here.
  Adding it now expands identity/deployment assumptions before the first task
  screen. Do not invent provider support or build an embedded login WebView.
- **Collector or shared service secret:** rejected. Source ingestion is not
  owner authority. No shared key belongs in an APK or checked-in settings.

## 3. B — Preserve the browser guard; separate device traffic

Introduce `/api/device/v1/*`. It maps only explicitly allowed operations to the
existing ledger handlers. Keep `/api/v1/*` as the browser/collector interface
during transition. Use one implementation of task validation, review guards,
idempotency, reminder revisions and purge. A second client is not a second DB.

Authentication must produce a verified identity **and authentication kind**.
The current boolean authorization result is insufficient for choosing the guard.

| Request | Required authority | Origin rule |
|---|---|---|
| Existing browser owner API | Existing verified Access owner JWT | Preserve same-origin writes; reject missing, `null` or foreign Origin. |
| New device ledger API | Valid active device bearer, sent in Authorization | Reject any Origin header, including `null`. Cookies/Access JWT alone cannot authorize it. |
| Device enrollment only | Valid unexpired enrollment grant, then owner activation | No Origin; no personal-data read. Strictly bounded bootstrap exception. |
| Device administration | Verified Access owner | Same-origin writes; device bearer cannot administer other credentials. |
| Collector `/sync*` | Existing source-scoped authentication | Preserve existing collector rules. Never promote it to owner. |

Reject mixed/ambiguous credential use. A missing Origin or a spoofed User-Agent
is never authentication. Do not attach a fake same-origin header from Kotlin.
Do not issue wildcard/credentialed CORS for the device namespace. Cross-origin
Authorization preflights are denied; form/simple requests have no valid bearer.
Even if a web request has no Origin, it still lacks the secret. This is the
protection against malicious web pages, not a claim that Origin proves a caller
is native. Same-origin script compromise remains a risk to the existing browser
session; keep CSP and output escaping.

Use verified platform HTTPS, strict hostname checks, finite timeouts and bounded
JSON responses. Do not forward bearer headers through redirects. Reject HTML
login responses as API errors. Keep cloud HTTPS separate from the existing
private Linux connection and its certificate pin; do not reuse its trust manager.

### Cloudflare is an additional deployment gate

Worker authentication is useless if Access redirects the native request before
it reaches the Worker. Existing wrangler configuration does not establish the
owner's actual edge policies.

The intended deployment uses a narrowly scoped device path with **application
credential enforcement at the Worker**, while browser/admin paths keep Access.
Cloudflare documents specific path policies, but warns that Access Bypass removes
its controls and request logging [E1]. Do not add an unrestricted bypass to the
existing application. Native traffic would deliberately rely on the new Worker
authenticator; it would no longer receive Access's browser protections. Safe
application audit must contain only credential IDs, operation kinds, counts and
fixed error codes, never secrets, request bodies or raw content.

Before enabling this path, verify the actual hostname, path precedence,
Worker-level versus hostname-level Access, preview/`workers.dev` aliases and
request limits. Prove invalid credentials return no data, valid device requests
reach Worker, and browser/admin protections remain intact. Test deployment
variants, not just the local harness. The current `run_worker_first` `/api/*`
pattern covers the proposed namespace, but dispatcher changes are still needed.

**BLOCKED until that account observation exists.** If Worker-wide protection
cannot safely isolate this path, stop. Do not bypass the entire Worker, add a
Cloudflare account token to Android, or auto-provision another service. Reassess
an isolated device ingress or actual supported OIDC/service-auth deployment with
the owner before implementing that different design. No account change is made
by this plan. The endpoint is network-reachable but never an unauthenticated
personal-data endpoint; even native health requires authentication.

## 4. C — Build comfortable Views; retain the API-28 safeguard

Use the existing module, application ID, minSdk28, compile/target35, Kotlin2.1.21
and AGP8.9.2. Do not change toolchain versions for the port. Use native Views,
recycled `ListView` rows, resource strings, drawables and bundled fonts. Use
existing platform networking, JSON, SQLite and background execution primitives.
No Compose, AppCompat, Material Components, Room, Retrofit or new dependency is
required for this design.

Keep `verifyApi28` on **all production Kotlin**, including UI/network/storage.
Keep `-no-jdk`, `-no-stdlib`, `-no-reflect`, its API28 classpath and assemble/lint
prerequisites. Keep fatal NewApi/InlinedApi lint. The present task discovers
`src/main/java/**/*.kt`: put new Kotlin there and add an inventory assertion in
a future check so a new source directory/module cannot silently escape coverage.
Do not narrow it to the queue. A UI helper can repeat the same missing-interface
mistake. Preserve Queue's explicit AutoCloseable implementation.

Use the existing mutation approach to demonstrate that inherited-interface,
newer Android and newer Java API mistakes still fail the guard. Then perform
actual install/cold-launch/reopen before running deeper UI cases. This guard
checks an API surface, not lifecycle, vendor behavior or runtime correctness.

**Rejected:** Compose-aware checking could be valid, but needs its compiler
plugin and dependencies integrated into the standalone checker and another
compatibility proof. The brief's eleven unresolved references came from that
checker integration; this plan has not rerun the experiment. Narrowing the check
leaves blind UI paths. Neither is the
smallest conservative first port. Compose is deferred, not declared impossible.

Keep the accepted pixel-paper identity. Reuse palette, bitmap definitions,
licensed font families and domain copy as references, not React components.
Package Android-supported font resources with their licenses; the current WOFF
files are not a drop-in Android font-resource plan [E4]. Use real Buttons,
TextViews and EditTexts for controls. Custom drawing is decorative only.

Use at least 48dp touch targets and scalable `sp` text. Preserve readable done
text, labels beyond color, accessible announcements/focus, ID/EN and explicit
light/dark selection. “System” follows available OS configuration; do not assume
Android9 exposes a modern dark-theme setting. Support 200% text, long Indonesian
and Arabic titles, keyboard input and TalkBack. Keep user motion/haptic settings
and provide reduced/no-motion behavior. Treat these as acceptance requirements,
not as a claim that platform Views are automatically accessible.

## 5. Screen-by-screen port

Keep four primary tabs: Today, Tasks, Review, Calendar. Settings contains labeled
links to Sources, History, Reminders and Capture. Back closes the current sheet,
then detail, then returns through the tab stack. Restore selected tab/filter/day
and unsaved structured drafts after rotation/process recreation. Never restore an
approval action as an automatic command.

| Surface | Keep / redesign / drop | Native scope and what is lost |
|---|---|---|
| Today | **Keep, redesign layout** | Real briefing, due/overdue cards, this-week rows, review count and always-visible Tanpa tanggal. Manual completion/add work without Linux, AI or notification permission. Browser shell is lost; counts still disclose partial data. |
| Tasks | **Keep** | Academic/Himpunan/personal filters, title query and cursors. Keep group order and due sorting. Recycle rows; do not inflate a year into one ScrollView. Lose DOM/CSS and browser search, not task search. |
| Task detail | **Keep** | Four distinct precisions, actual reminder policy, notes, safe source aliases and newest-first paged history. Edit/complete/archive/delete use real APIs. Browser URLs become a native navigation stack; no new external deep-link promise. |
| Review | **Keep** | Stack, explicit accept/edit/reject/clarify, conflict before/after, target search, opaque evidence IDs and compensating Undo. Keep button/keyboard equivalents to gestures. No quotes or raw evidence viewer in the cloud client. DOM gesture code is rewritten. |
| Calendar | **Keep** | Monday-first month, 48dp day controls, selected-day list, context labels, bounded month pages and partial disclosure. Unknown/approximate stay out of cells and remain linked to Tanpa tanggal. Lose browser month URLs, not navigation. |
| Settings | **Keep, reorganize** | ID/EN, theme, owner timezone, reminder rules/inbox, safe source health/purge/acknowledgments, canonical export and Linux backup instructions. Add sign-in/revoke-self and a separate Capture page. Collector-key minting/device administration stays on trusted Access browser. Linux exports/imports/AI consent stay on Linux. |
| Full editor | **Keep** | Title, description, context, kind, status, priority and explicit due precision/timezone. Preserve version conflicts and drafts. Do not coerce approximate into unknown or date-only into midnight. Native form replaces HTML form. |
| Quick-add / date / proposal-date sheets | **Keep, redesign containers** | Use accessible Dialog/Activity panels with Back/cancel/focus return. Quick-add is manual; proposal-date is a draft until approval. Keep the 4.5-second actionable Undo surface. Drag-to-dismiss and exact web animation geometry may be dropped; confirmation, access and recovery are not. |

Also retain source/device acknowledgment states: queued, delivered, applied,
expired and never acknowledged remain different. A phone UI does not turn a
Linux or cloud receipt into proof that raw data was erased. Keep local mapping,
pause/wipe/repair controls separate from cloud source deletion.

The wire DTO must match actual responses. Worker `task()` exposes `due` parsed
from internal `due_json`. Do not send a new invented database-shaped payload.
Use existing task-read policy/history and review/Undo endpoints. The current
reminder policy lives in settings, despite the older conceptual table name
`reminder_rules`. Map the actual implementation.

For native cache/recovery, use a separate SQLite store with encrypted structured
payloads and explicit observation timestamps. Do not reuse the raw queue DB or
its keys. Keep one durable immutable online-request journal: body, idempotency
key and expected version are stored before send. Network loss never creates a
new key or an assumed success. Reconnect refreshes observations; retry is explicit.
Offline-created writes remain out of scope. Unknown/unvisited pages are
unavailable, not empty. Clear private ledger state on logout/auth loss and apply
source-generation changes before trusting cached evidence-derived views.

Worker remains authoritative for due validation, versions, due_revision,
reminder cancellation, review compensation and tombstones. Port JS display rules
into Kotlin with shared synthetic date fixtures. Do not make the phone's clock
or timezone database a second authority. Relative countdowns are estimates;
a wrong clock must not approve a task or schedule a false exact deadline.

## 6. Scope and size estimate

**Estimate, not a promise:** add about **6,000–10,000 production Kotlin lines**,
for approximately **6,400–10,400 total** including the existing 381 capture lines.
The brief's 3,891 React lines are a scope reference, not a conversion formula.

| Work | Estimated new Kotlin lines |
|---|---:|
| Native components, eight surfaces, navigation, forms and accessibility state | 3,800–6,200 |
| Auth/network/DTOs, encrypted cache/journal, lifecycle and recovery | 1,600–2,800 |
| Capture integration, resources wiring and error/status presentation | 600–1,000 |

Resources/XML/drawables/fonts, Worker security/admin/migration work and future
tests are additional. Allow roughly **4–7 focused engineering weeks** for one
experienced implementer plus owner feedback; this is planning uncertainty, not
a delivery date. Account setup, device access and capture findings can add time
without a useful upper bound. Re-estimate after enrollment plus one real
Today→detail→complete round trip. Do not promise a smaller native rewrite by
omitting offline recovery, review or accessibility.

## 7. Order that preserves something usable

Each row is a future vertical slice. Preserve the preceding usable version until
its replacement has evidence. None is complete by writing this plan.

| Step | Deliver next | What the owner can still open and do | Evidence required before advancing |
|---|---|---|---|
| N0 — Remove feasibility surprises | Capture a clean baseline; establish signing continuity; review account routing; build one styled Views screen with the unchanged API28 guard. | Current PWA for task actions; existing APK for capture setup/status. | New APK install/launch/reopen and readback; actual Access path decision. If unavailable, record blocked and retain baseline. |
| N1 — Secure native read slice | Migration0007, protected enrollment/admin, device auth/Origin split, native Today/Tasks/detail and separate Capture entry. | Native reads; current PWA still performs writes. Capture setup remains accessible without cloud login. | Anonymous/forged/collector/native/browser scope matrix; real enroll/revoke/expiry; phone cold/warm launch and permission-denied use. |
| N2 — Complete manual ledger | Quick-add, full edit/date, completion/archive/delete, history, encrypted observations and same-key recovery. | Owner manages manual academic and organization tasks natively. | Lost response/process-death/retry/409, timezone precision, offline/logout, cache-key loss and multi-client edit cases. |
| N3 — Native review | Real proposal pages, conflict target, all decisions and compensating Undo. | Native daily task and AI-proposal review; PWA remains rollback. | No auto-approval; missing evidence, stale version, purged source, repeat decision and interrupted Undo. |
| N4 — Complete daily surfaces | Calendar paging, Settings, inbox/rules, source health/purge, export and recovery administration. | All eight surfaces native; Linux still handles raw imports/evidence/AI. | Year-sized synthetic ledger, partial states, ID/EN/themes/text scaling/TalkBack, purge/restore and laptop-off task access. |
| N5 — Owner pilot and collection gates | Native identity/icon/resources, upgrade/restart hardening, real capture/transport matrix and daily comfort fixes. | Native daily app; existing PWA retained for fallback. | One-minute smoke after every APK, owner-granted listener matrix and private transfer tests, then seven-day owner use. No permission means full-MVP release remains blocked. |
| N6 — Retire PWA | Remove React deployment only after native parity and owner acceptance. | Native task app, Linux local tools and protected recovery/admin page. | All required gates established; reconcile old pending requests and retain rollback source. No automatic cutover. |

Before N1 changes, future implementers reconcile AGENTS/ADR-006/007/021, the
privacy boundary matrix, data/API/UI contracts and milestone wording. This plan
records the conflict resolution here because this session permits **only this
file**. Do not silently leave “companion cannot manage tasks” as an operative rule.

Keep package `id.academicos.companion`, the listener component names and existing
queue schema/key aliases through the first port. Confirm the owner's signing
key permits an in-place update. A fresh debug signing key may not update the
installed APK. **Do not solve that by uninstalling or clearing app data.** Stop
and arrange a private owner-local signing/recovery path. Never include the key
in this repository or chat. Opening the new UI must not reset mapping, pairing,
permission or untransferred raw rows.

No database copy from IndexedDB into Android is required. Read canonical state
from Worker. Resolve every old PWA pending request with its original identity
before cutover; otherwise a lost create could be duplicated. Keep API/migrations
additive and idempotency scopes shared across authorized clients. Roll back UI
with a compatible APK and preserved stores; revoke native credentials if needed.
Do not drop D1 migrations or restore old backups over newer tasks/tombstones.
A whole-D1 recovery may include old credential-hash rows. Keep device ingress
closed, revoke restored clients/grants, and re-enroll before reopening it.
Excluding credentials from the application export does not exclude tables from
a platform database snapshot. Test that distinction before release.

## 8. What deleting the PWA actually changes

Choose deletion after parity, rather than maintaining two complete daily UIs.
Keeping it only on localhost would require a secure cloud-auth proxy; simply
serving React locally fails the existing remote Origin/session assumptions.
Keeping it as the cloud deployment target retains duplicate maintenance and
does not meet the owner's new primary-platform direction.

At N6, archive its source in Git history. Remove the React build/deploy target,
`apps/web/dist` asset dependency, Worker ASSETS binding/fallback, SPA routing and
PWA-specific build/test steps. **Do not remove the Worker, D1, cron or API domain
logic.** Serve a small Access-protected enrollment/revocation page separately.
It is owner recovery, not a second task UI. Verify its auth on direct URLs too.

Until N6, the Worker still ships the existing PWA assets. At retirement, withdraw
legacy browser task access with an authenticated retirement response, leaving
admin and collector routes intact. Arrange a retiring service-worker update and
owner-confirmed private-cache clearing after pending requests are reconciled.
An offline old PWA may retain its snapshot; do not claim remote erasure. Re-test
asset dispatch so the device API cannot fall through to an HTML shell.

Loss is explicit: no laptop browser task/review/calendar surface after cutover,
and no browser-only rollback without restoring the reviewed web deployment.
Linux's local import/evidence/processing UI and encrypted canonical backup/restore
remain. ITK Moodle collection stays on Linux; do not copy its account secrets to
Android or claim source access merely because its collector exists.

## 9. What this migration cannot establish without the owner

All observations below are **unverified for the proposed native product**:

- Signature-compatible update; preserved queue/keys/pairing; correct installed
  APK provenance; cold launch, warm reopen, rotation and process-death recovery.
- Real Android9 TLS/trust/time errors, credential/cache Keystore behavior,
  key loss, backup/transfer exclusion and vendor storage behavior.
- Comfortable rendering, keyboard/Back, TalkBack, focus, 200% text, native
  light/dark/system behavior, haptics/motion and startup/memory/battery cost.
- Owner-granted notification access and listener lifecycle, actual WhatsApp
  metadata, selected/unselected filtering, muted/hidden previews and dedupe.
- Locked-screen/battery-saver behavior, restart/reboot/force-stop, queue limits,
  retention and interrupted writes/receipt cleanup.
- Real private phone→Linux TLS pin/hostname checks, mobile-data/VPN coexistence,
  Linux-off accumulation, reconnect and independent purge acknowledgments.
- Delivery while the app is closed, foreground/background notification behavior
  and OS restrictions. A native app does not make remote push exist. Keep the
  cloud inbox; native push transport remains a separate feasibility gate.

Phone access alone also cannot prove Cloudflare account/preview policy,
production D1/auth/rate limits or real provider/ITK permissions. Those require
separate account/provider observations. No account, phone or provider was used
in this planning session. If the owner does not grant notification access, a
useful manual native ledger can ship only as a clearly limited preview. The
full dual-ingestion MVP cannot honestly be called complete.

## 10. One-page risk register

| Risk most likely to stop this migration | Cheapest early test — future, not run here | Stop condition / response |
|---|---|---|
| **Auth works locally but Access blocks the phone, or an exception exposes owner writes.** | Before porting screens, send a synthetic device read/write through the actual intended hostname. Repeat with missing/wrong/revoked/expired credential, forged JWT, collector secret, browser cookie and foreign/missing/null Origin. Check browser/admin/preview routes too. | No personal data without the right authority. If routing cannot be safely isolated, stop N1 and keep Access/PWA unchanged. |
| **New native UI crashes or damages capture state on API28 upgrade.** | Build one real Views screen with the unchanged surface gate; prove inherited-interface/new-API faults fail. Owner installs over the existing APK and runs one-minute smoke plus queue/pairing-preservation checks using synthetic data. | Signing conflict, crash, lost key or unexplained queue change blocks further rollout. Preserve stores; no uninstall/reset workaround. |
| **A cheaper-looking port loses dates, approval or retry correctness.** | One academic task and one organizational task through create→date edit→conflicting proposal→accept→Undo. Drop the committed response and kill/reopen before retry. Then test purge/later-edit rejection and a 1500-task year. | Duplicate tasks, invented instants, overwritten edits, revived purged data or false completeness block parity. Reuse Worker invariants, not browser snapshots. |
| **It launches but is uncomfortable, or collection/background behavior is unusable.** | Owner tries Today/Tasks/detail/review at large text with TalkBack and battery saver, then runs selected-vs-unselected and Linux-off/reconnect capture cases on synthetic conversations. | If Views layout is uncomfortable, fix the native component system before more screens. If capture is unsupported, retain export/manual preview and keep full-MVP release blocked; do not broaden collection. |

## Evidence references

These explain platform constraints. They do not verify this deployment/device.
Checked as documentation on 2026-11-07. The authentication and rollout designs
above are engineering choices, not claims that these pages implement the app.

- **E1:** Cloudflare [application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/),
  [path exceptions and their warning](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/),
  and [Worker versus hostname/path protection](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).
- **E2:** Cloudflare [D1 sessions/primary reads](https://developers.cloudflare.com/d1/worker-api/d1-database/#withsession).
- **E3:** Android [Keystore threat limits](https://developer.android.com/privacy-and-security/keystore).
- **E4:** Android [font resources](https://developer.android.com/develop/ui/views/text-and-emoji/fonts-in-xml).
