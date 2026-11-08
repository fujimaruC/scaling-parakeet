# Native Android owner handoff

Implementation preview. All eight native surfaces are present. Phone behavior,
real enrollment and Cloudflare routing are **unverified**. The PWA stays in place
until native parity and owner acceptance. No milestone is complete. Notification
access is last recorded false; no listener event or capture has ever occurred.

## Current short procedure

Use [OWNER-DEVICE-SESSION](OWNER-DEVICE-SESSION.md) for the owner-driven recorder,
[SIGNING-SAFETY](SIGNING-SAFETY.md) before any update, and
[NATIVE-CLOUD-CHECK](NATIVE-CLOUD-CHECK.md) for real-account acceptance. The older
commands below describe preparation, not permission to bypass a signature mismatch.

## Install safely

Build with the owner's existing local signing identity and update in place:

```bash
cd apps/android-companion
env ANDROID_HOME=/home/riko/Android/Sdk ./gradlew assembleDebug lint testDebugUnitTest verifyApi28 --no-daemon -Dorg.gradle.java.home="$HOME/.local/opt/jdk-17.0.21+9"
```

The wrapper launches bare `java`; also put the JDK 17 `bin` directory first on
PATH if necessary. Required SDK components: platforms 28/35, build-tools 35.0.0
and platform-tools. No application dependency was added.

A cloud-built debug APK has a separate signing identity. If an update reports a
signature mismatch, rebuild with the original key. **Do not uninstall or clear
app data just to make installation succeed.** That can destroy untransferred
notifications and pairing. No signing key is supplied.

Run the one-minute [device smoke](DEVICE-SMOKE.md) first. Capture is reachable
from enrollment and Settings without cloud login. Opening the task app does not
grant notification access, enable collection, change raw-queue keys or wipe data.

## Account gate and enrollment

This work makes no deployment or account change. An account administrator must
verify these observations before enabling production native use:

1. Apply migrations 0001–0007 through the existing deployment procedure. 0007
   stores only hashes of random owner-device secrets and enrollment grants.
2. Keep `/owner-devices` and browser `/api/v1/*` under verified owner Access.
   Browser writes still require their exact same Origin.
3. Review path precedence and every custom/preview/`workers.dev` alias. Only
   `/api/device/v1/*` uses the new Worker bearer authenticator. Native requests
   must reach it without an Access login redirect. **Never bypass the whole
   Worker or hostname.** If safe path isolation is impossible, stop at this gate.
4. Prove anonymous, expired, revoked, forged and wrong-scope calls reveal no
   personal data. Native calls carrying Origin or ambient browser/collector
   credentials must fail. Recheck browser/admin protection. Local Miniflare
   results do not prove the account configuration.
5. Check request quotas and diagnostic configuration. Never record bearer
   headers, grants, bodies, raw chat or notification content in diagnostics.

Use a trusted Access browser at `/owner-devices` to create a five-minute grant.
With a screen lock configured, enter the HTTPS Worker origin and grant in the
phone. The install generates and encrypts its own random secret before send.
Pending enrollment has no ledger authority. Compare the **entire** fingerprint
on phone and browser, explicitly activate that matching install, then tap Check
activation. Grant possession alone does not activate another device.

The fingerprint hashes a random credential, never a message. Do not put grants
or secrets into URLs, chat, screenshots, clipboard workflows or shared files.
Activation starts a 90-day lifetime; there is no indefinite refresh token.
Settings shows expiry and the app warns near expiry using the phone-clock
estimate. Server authorization is authoritative. Exact pending enrollment can
be retried while its grant is valid. For an expired pending session, cancel it
locally and use a new grant/install credential.

A lost phone is revoked from a trusted browser. The phone can revoke itself;
it cannot enroll another device, mint collector credentials or call `/sync*`.
Offline revocation cannot remotely erase an offline snapshot. On authenticated
denial the native credential, task snapshot and task-write journal are cleared.
An earlier unconfirmed send may already have committed. Inspect fresh canonical
data after reenrollment before creating a replacement; the app retains a
non-content warning flag for that case. Logout never wipes the raw queue or
Linux pairing.

## Check all eight surfaces with synthetic data

| Surface | Observation the owner must make |
|---|---|
| Today | Real briefing/review count, due/overdue cards, exact-only countdown and urgency, completion/reopen, week rows and Tanpa tanggal; partial/cached disclosure. |
| Tasks | Academic/Himpunan/personal filters, title search, five groups, archive status, chronological ordering, more than 100 tasks and cursor navigation. |
| Detail | Four distinct precisions, actual reminder policy, notes/source aliases, newest-first history and older pages, completion, full edit and delete. |
| Review | Evidence IDs, issues, explicit conflict target choice, draft-only editor/date change, confirm-button approval, reject/clarify, compensating Undo. Swipes never approve/reject. |
| Calendar | Monday-first month, month/day selection, context labels, bounded month pages, partial counts, Tanpa tanggal outside cells. |
| Settings | ID/EN, system/light/dark, reduced motion, versioned timezone/reminder policy, contexts, source purge/status/retirement, reminders/history, canonical export, revoke-self/logout, Capture. |
| Full editor | Title, description, context, kind, status, priority, due precision/timezone; stale versions must not overwrite later changes. |
| Quick-add/date/proposal-date | Back/cancel, keyboard/focus return, explicit date and time, rotation/process-death drafts; proposal draft save never approves. |

Use synthetic canonical titles and proposals. Do not paste chat text/quotations
into task fields. Evidence IDs are references; this is not a raw-evidence viewer.
Cloud purge is not proof of local erasure. Queued, delivered, applied, expired
and retired-unconfirmed stay distinct. A permanently offline laptop leaves phone
actions unresolved. Device inventory is explicitly incomplete.

## Recovery and accessibility

- Visit pages online, then disconnect. Known pages show cached observations and
  times. Unvisited pages are unavailable, not empty. New offline writes are
  disabled. Reconnect refreshes reads and never sends a mutation automatically.
- Interrupt a send after the server may have received it. Inspect the retained
  structured request; explicit retry must reuse its body, version and key.
  Never infer success/failure from a missing response. Repeat after process death.
- Kill/reopen during a draft, journal write, send and receipt commit. Check for
  duplicate tasks, unexpected approval, stale generations and lost drafts. A
  successful local receipt removes the matching editing form in the same
  transaction as journal removal, avoiding a restored duplicate quick-add.
- Revoke/expire the credential, reconnect, and verify task snapshots clear while
  the raw queue/pairing remain intact. Test task-store key loss only with disposable
  synthetic data and an explicit data-loss decision. Expect visible repair,
  never silent key generation over existing ciphertext.
- Exercise both languages/themes, long Indonesian/Arabic titles, 200% font,
  narrow layout, keyboard/D-pad, TalkBack reading/focus/announcements, dialogs,
  focus return and 48dp targets. `sp`, labels and lint are implementation evidence,
  not proof of accessibility on the OPPO.
- Check reduced motion and disabled system animation/haptics. Relative countdowns
  use the phone clock. They never authorize writes or define canonical deadlines.

Record build strings, counts, booleans and fixed codes only. No notification
text/titles/group keys, message screenshots or raw stack traces in evidence.
Run the existing owner-driven capture harness after smoke, with genuine owner
input. An unrun case must never become PASS.

## Optional local harness

`npm run dev:synthetic` serves isolated loopback Worker/D1 and `/owner-devices`.
Browser authority is injected only in this development harness; it does not
verify Access and is not accepted by the production device authenticator.
A debug-only network resource permits HTTP `localhost` and `10.0.2.2`. An owner
may choose ADB reverse for port 4173, use the laptop browser at
`http://127.0.0.1:4173/owner-devices`, and point the debug app to
`http://localhost:4173`. This phone path is unverified here. Never expose the
harness publicly. Release networking remains HTTPS-only with redirects rejected.

Linux retains export import, raw processing, explicit provider consent and
backup tools. Native UI does not replace or relax those boundaries. See
[NATIVE-CHECKS](NATIVE-CHECKS.md) and [VERIFICATION-LOG](VERIFICATION-LOG.md) for
actual local results and exclusions.
