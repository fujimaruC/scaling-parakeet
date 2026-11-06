# Project status — evidence and remaining work

**2026-11-06 · Asia/Makassar. Whole-system implementation continues; full MVP is not complete.**

Remote base: `58f00ed4770f16ae5bf73e205cad8c293bfea608` (GitHub main fetched at session start). Working branch: `build/academic-os-system`; prior implementation checkpoint `43c6ecd`. Owner authorizes all milestones with placeholder credentials in shared materials. No remote push, deployment, real chat import, real AI request or paid provisioning performed.

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

## Latest commands and outcomes

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

1. Run the full actual Android 9 lifecycle/low-RAM/metadata/filter/queue/restart/retention/interrupted-ack matrix. Test native HTTPS pin rejection, private overlay/VPN coexistence, remote recovery and platform background retry. Compiler/lint and synthetic Linux HTTPS tests do not prove phone behavior.
2. Configure the owner's private network and receiver locally. No VPN vendor/account choice or real peer pairing is claimed. Finish release UI, localized native resources, launcher icon and signed release packaging.
3. Verify actual named 9Router provider/route/privacy policy with synthetic input, positive consent and prompt-injection tests. Durable outbound jobs currently retry from UI; automatic Linux retry scheduling remains pending. Multi-source production credential management needs a dedicated operational interface.
4. Complete Web Push subscription lifecycle and physical delivery evidence. Quiet hours defer/coalesce new inbox deliveries without changing deadlines; daylight-saving transitions are covered. Current durable notifications are in-app. Verify scheduler quotas, policy rebuild timing and catch-up on production D1.
5. Extend PWA server-query controls, calendar pagination across large ledgers, full labels/translations and accessibility/keyboard/screen-reader audit. Loaded subsets are disclosed. Finish device-compatible installation/update tests.
6. Complete proactive purge-status polling when no outbound job exists, offline acknowledgment recovery and phone-status aggregation in cloud. Status must remain pending until verified. Exercise multi-source/manual-retain and backup tombstones across actual devices.
7. Verify owner-only production/preview Access policies, valid/invalid JWT paths, source revocation, request budgets, Worker CPU and D1 limits in the actual account. All production bindings remain placeholders; private APIs deny access when unconfigured.
8. Restore encrypted canonical data into disposable D1, verify future reminders, restored tombstones and revoked source reconciliation before sync. Current automated restore uses disposable SQLite.
9. Evaluate authorized ITK source access, finish cost/transport ADR and perform the seven-day owner pilot. Manual export import remains functional when listener collection is unavailable.

Existing tasks, proposals and in-app reminders do not depend on Linux/AI availability. Notification capture never claims complete WhatsApp coverage. No original group history, physical push delivery, production deployment or ITK integration is inferred from these checks.
