# Brief for the implementation agent (Astra)

**Base:** `main` at the commit that added this file. Verify with `git log --oneline -1 -- docs/BRIEF-ASTRA.md`.

**Read `docs/PLAN-NATIVE.md` first.** It contains the architecture decisions. This file does not repeat them; it tells you what to build, what has already bitten us, and what will not survive review.

---

## Your job

Build the native Android task application. All of it. Eight surfaces: Today, Tasks, Task detail, Review, Calendar, Settings, full editor, and the quick-add/date/proposal sheets.

The owner has explicitly rejected scope cuts. Do not deliver "one screen to prove the stack" and call it done. Do not omit Review, Calendar, offline recovery, accessibility or error states because they are hard. They are the product.

## What exists now

| Path | What it is |
|---|---|
| `apps/android-companion` | Kotlin, 381 lines. Notification listener, encrypted queue, transport, pairing. **Reuse it; do not rewrite it.** |
| `apps/android-companion/.../MainActivity.kt` | 63-line probe screen. Stock widgets, `Theme.Material.Light.NoActionBar`. Replace the UI, keep the capture plumbing. |
| `apps/web` | React PWA, 3,891 lines. **Reference for behaviour, copy and layout. Not a conversion formula.** It currently serves as the Worker's static assets. |
| `apps/worker` | TypeScript Worker + D1, migrations 0001–0006. Authoritative for all validation. |
| `collectors/local` | Python. Stays on Linux. Do not port it. |
| `apps/web/src/design/tokens.css` | The palette. Copy the hex values, not the CSS. |
| `apps/web/src/pixel/icons.ts` | Bitmap icon definitions. Redraw as Android drawables or `Bitmap`-style views. |

## Decisions already made — do not relitigate

From `PLAN-NATIVE.md`, accepted by the owner:

- **A. Device credential.** Each install enrolls, gets an expiring revocable opaque credential; only its hash is stored in D1. New migration `0007`.
- **B. `/api/device/v1/*` namespace.** Device traffic sends `Authorization`, and must **not** send an `Origin` header. Browser keeps `/api/v1/*` with the existing same-origin rule. One implementation of validation, idempotency, reminder revisions and purge — a second client is not a second database.
- **C. Platform Views.** No Compose, no AppCompat, no Material Components, no Room, no Retrofit, no new dependency. Keep `verifyApi28` at full strength.
- **PWA retirement** only after native parity and owner acceptance. Until then the Worker still serves `apps/web/dist`.

If you believe a decision is wrong, say so in your report and implement it as written anyway. Do not silently deviate.

## Facts that cost us real time — use them

**API shapes you must match exactly.**

Task objects come from `task(row)` at `apps/worker/src/index.ts:119`, which spreads the row and replaces `due_json` with `due`. So the wire has `due`, never `due_json`.

```ts
Due = {
  precision: 'datetime' | 'date_only' | 'approximate' | 'unknown'
  local_date: string | null
  local_datetime: string | null
  timezone: string | null
}
```

Unknown due is `{precision:'unknown', local_date:null, local_datetime:null, timezone:null}`. Never synthesise a midnight or an instant for `date_only`, `approximate` or `unknown`. Those four precisions are four different things.

Task row columns: `id, context_id, title, kind, description, status, priority, due_json, due_at_utc, version, due_revision, mutation_id, created_at, updated_at, deleted_at`. Status is one of `todo, doing, blocked, done, archived`. Priority is `low, normal, high, urgent`.

Routes that exist: `/me /health /tasks /search /contexts /briefing /candidates /history /sources /settings /settings/reminders /reminders /export /collector-credentials /sync /sync/status /sync/device-actions /sync/purge-ack`.

Writes are optimistic-versioned. `POST /tasks` and updates take an `Idempotency-Key` header and compare versions; a mismatched digest on the same key returns `409 IDEMPOTENCY_CONFLICT`. `due_revision` changes cancel reminder intents through a database trigger.

**Four things that will break you if you ignore them.**

1. **`verifyApi28` compiles every file under `src/main/java` with `-no-jdk`, `-no-stdlib`, `-no-reflect` against android-28 stubs, and `assembleDebug` depends on it.** It exists because a real Android 9 defect shipped: `Queue` did not implement `AutoCloseable`, so `use{}` threw `ClassCastException` and the app crashed on launch while every other check passed. Put new Kotlin under `src/main/java`. Do not narrow the task.

2. **`android:usesCleartextTraffic="false"`.** HTTPS only. For local development against a laptop, use a debug-only network security config permitting `localhost` and `10.0.2.2`; never relax the release manifest.

3. **The Origin gate.** `apps/worker/src/index.ts:716` rejects any non-GET whose `Origin` is not the Worker's own origin. Your device namespace must be a separate path checked before that gate, authenticated by the device credential, and rejecting any request that carries an `Origin` header at all. Do not attach a fake same-origin header. Do not delete the guard.

4. **Build command.** `gradlew` is a 4-line shim calling bare `java`, so `JAVA_HOME` is ignored. You must pass the Java home explicitly:

```bash
cd apps/android-companion && env ANDROID_HOME=/home/riko/Android/Sdk \
  ./gradlew assembleDebug --no-daemon -Dorg.gradle.java.home="$HOME/.local/opt/jdk-17.0.21+9"
```

Local `sdk.dir` in `local.properties` is gitignored; do not commit it.

**Palette** (`apps/web/src/design/tokens.css`, light / dark):

```
bg #f4f2ec / #16161a      card #ffffff / #202026
ink #1b1b1f / #f2f0ea     muted #66635b / #a9a69d
accent #2f54eb / #7c95ff  urgent #d6402a / #ff7a63
warn #e09a1a / #f2b64a    course #2f54eb / #7c95ff
org #8a4fd6 / #b98bff    ok #1f8a5b / #4cd39a
dots #d8d6d0 / #343438    on-accent #ffffff / #16161a
```

Fonts are `.woff` at `apps/web/public/fonts/`. **Android cannot use WOFF.** Convert Pixelify Sans and Inter to TTF/OTF and ship them as font resources with the OFL licences alongside. Pixelify Sans is display-only and used for headings, dates and section labels in caps; Inter is body text.

## What must be true when you finish

- Every surface listed above exists and is reachable.
- Real Worker data, not fixtures, in the app.
- Completion, quick-add, edit, delete, review approve/edit/reject, and compensating Undo all work against the real API with correct versioning and idempotency.
- Offline: an explicit online-request journal written before send, same-key retry, never a background write on reconnect, never an assumed success.
- Four date precisions stay distinct and the UI never collapses them.
- Approval is never inferred from a keystroke, a date edit, a swipe or a default target.
- 48dp touch targets, `sp` text at 200%, TalkBack labels, focus order, ID/EN, light/dark, reduced motion.
- Unloaded, loading, unavailable, empty and partial are five distinct states. Never render one as another.
- `assembleDebug`, `lint` and `verifyApi28` all pass.

## What not to do

- Do not add a dependency. If one is truly unavoidable, stop and ask instead of adding it.
- Do not weaken `verifyApi28`, the Origin guard, approval, or privacy rules to make something pass.
- Do not put raw notification text, chat exports, quotations or raw-content hashes into the Worker, D1, assets, logs or backups.
- Do not claim a device, store, provider or account test passed. There is no device attached and no account.
- Do not fabricate completion. If something is unverified, write unverified.

## Report

Paste real command output. State what you built, what you verified, what you could not, and every place the plan did not survive contact with the code. If you found a defect in the plan, say so plainly — that is more valuable than a clean report.