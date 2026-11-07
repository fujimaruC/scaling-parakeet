# Next prompt — native Android migration plan

**How to use:** Part 1 is for the owner. Part 2 is the brief — paste it whole.

Repo state: `main` = `07a7ee8`, clean, pushed. Confirm with `git log --oneline -1`.

---

## Part 1 — Why this scope

The owner reversed the platform: the product should be a native Android app, not a PWA.
Four documents record the PWA as the plan, including the owner's own first commit
(`293525f`), so the reversal is real and the code does not match it.

The owner chose **plan before code**. That is correct, because three blockers currently make
a native client impossible without a design decision first:

1. **No native auth path exists.** `apps/worker/src/auth.ts` accepts only a
   `Cf-Access-Jwt-Assertion` header, which Cloudflare Access sets for a browser session. The
   only other credential is `X-Collector-Key-Id` HMAC, scoped to one `source_id` and accepted
   only on `/sync`. There is nothing a Kotlin app can present to reach `/tasks`.
2. **The Origin gate blocks native writes.** `apps/worker/src/index.ts:716` rejects any
   non-GET whose `Origin` header is not the Worker's own origin with `403 INVALID_ORIGIN`.
   A native HTTP client sends no `Origin`.
3. **Compose cannot build.** `app/build.gradle.kts` runs `verifyApi28`, which invokes
   `K2JVMCompiler` directly with `-no-jdk` and no Compose plugin, so every `androidx.compose`
   import fails there, and that task gates `assembleDebug`. Verified by probe: the plugin
   resolves and the build reaches `assembleDebug`, then fails on 11 unresolved Compose
   references inside `verifyApi28`.

None of those is a coding problem. Each is a decision about security or build policy, and
the plan has to make the decision and defend it.

---

## Part 2 — Paste this

```text
You are the architecture agent for Academic OS, a private single-owner academic and
organizational memory system. One user. No teams, no registration, no public personal-data
endpoint.

The owner has decided the product should be a native Android app, not a PWA. You are NOT
writing application code this session. You are producing the migration plan that makes that
decision executable, and you are expected to say where it cannot be.

REPOSITORY
  https://github.com/fujimaruC/scaling-parakeet
  Branch: main
  Current commit: 07a7ee8
  Verify: git log --oneline -1

READ FIRST, IN THIS ORDER
  AGENTS.md
  docs/DECISIONS.md                 ADR-006 auth, ADR-021 the design contract
  docs/16-OWNER-DECISIONS.md        read the provenance warning at the top
  docs/07-SECURITY-PRIVACY.md
  docs/10-API-CONTRACTS.md
  docs/02-DATA-MODEL.md
  docs/14-ANDROID-COMPANION.md
  docs/STATUS.md
  docs/06-UI-UX.md
  docs/design/UI-DESIGN-AGENT.md
  apps/worker/src/auth.ts
  apps/worker/src/index.ts         (routes, the Origin gate near line 716)
  apps/android-companion/app/build.gradle.kts
  apps/android-companion/app/src/main/java/id/academicos/companion/MainActivity.kt

WHAT EXISTS AND WORKS TODAY

  apps/web           React 19 + TypeScript PWA, 3,891 lines across eight screens:
                     Today, Tasks, Task detail, Review, Calendar, Settings, editor, sheets.
                     Design system in apps/web/src/design and src/pixel, self-hosted fonts.
  apps/worker        TypeScript Worker + D1, migrations 0001-0006.
  collectors/local   Python, including a new ITK Moodle collector.
  apps/android-companion  Kotlin, 381 lines total. It is a notification listener and encrypted
                     queue. Its UI is a 63-line probe in MainActivity.kt using stock Android
                     widgets and Theme.Material.Light.NoActionBar. It is NOT a task UI, and it
                     installs, launches and runs on the owner's OPPO CPH2015 / Android 9.

  Verified on hardware 2026-11-07: install_ok, launch_stays_open, reopen_ok all true; the
  installed APK hash matches the built one; no fatal exception in the observed window.
  notification access is NOT granted, so the listener has never run and no capture has
  ever occurred. That is a release gate, not something you can plan around.

WORKER API — what a native client would have to speak

  Routes: /me /health /tasks /search /contexts /briefing /candidates /history /sources
          /settings /settings/reminders /reminders /export /collector-credentials
          /sync /sync/status /sync/device-actions /sync/purge-ack

  Tasks carry id, context_id, title, kind, description, status, priority, due_json,
  due_at_utc, version, due_revision, mutation_id, timestamps, deleted_at.
  Writes are optimistic-versioned: POST /tasks and PATCH-style updates require an
  Idempotency-Key and compare versions. due_revision changes cancel reminder intents.
  Date precision is inside due_json and must stay four distinct things: exact timestamp,
  date-only, approximate, unknown. Unknown and approximate never acquire a deadline instant.

THREE BLOCKERS — the plan must resolve each one explicitly

  A. NO NATIVE AUTH PATH.
     apps/worker/src/auth.ts accepts only the Cf-Access-Jwt-Assertion header that Cloudflare
     Access sets for a browser. X-Collector-Key-Id is scoped to one source_id and accepted
     only on /sync. Nothing a Kotlin app can send reaches /tasks.
     Choose a design and defend it. Candidate approaches, none assumed correct:
       - Owner-side long-lived device credential, hashed at rest in D1, revocable, scoped to
         the same owner and not to a source. Requires new Worker auth and a new migration.
       - OIDC device flow so the phone obtains a token as the owner. Requires an identity
         provider and changes the deployment assumptions.
       - Keep Access and have the phone open a browser once to capture the JWT, then store it.
         Cheap, but consider token lifetime, revocation and what happens when it expires.
     Whichever you choose, state what it protects, what it fails to protect, how it is
     revoked, and what an attacker with the phone's storage can do. Do not invent an auth
     scheme that trusts an arbitrary header.

  B. ORIGIN GATE.
     index.ts rejects non-GET requests whose Origin is not the Worker origin. That guard
     exists to stop cross-site writes from a browser. A native client has no Origin.
     Decide: exempt authenticated non-browser clients, add a distinct authenticated route,
     or something better. If you loosen this check, you must show what still prevents a
     malicious web page from writing data. Do not delete the guard because it is in the way.

  C. COMPOSE VERSUS verifyApi28.
     Gradle compiles all Kotlin against android-28 stubs with -no-jdk, no stdlib and no
     Compose plugin, and assembleDebug depends on it. Measured: adding the Compose plugin
     and a trivial @Composable reaches assembleDebug, then fails with 11 unresolved references
     inside verifyApi28: Column, Composable, Modifier, Text, dp, and six androidx.compose
     imports.
     Options: build the UI with plain Android Views and no dependency (already proven to
     compile under this gate); make verifyApi28 Compose-aware; or narrow verifyApi28 to the
     packages that actually need API-28 stub checking.
     verifyApi28 exists because a real Android 9 defect once shipped: Queue did not
     implement AutoCloseable, so use{} threw ClassCastException and the app crashed on
     launch while every other check passed. Do not weaken it without replacing what it
     catches.

WHAT THE PLAN MUST CONTAIN

  1. A decision on A, B and C, each with the alternative you rejected and why.
  2. Screen-by-screen port scope. For each of Today, Tasks, Task detail, Review, Calendar,
     Settings, editor and sheets: keep, redesign or drop. Say what is lost.
  3. An honest size estimate. The React UI is 3,891 lines. State the expected Kotlin range
     and mark it an estimate, not a promise.
  4. The fate of the React PWA. Options include: deleted after native parity; kept local as a
     laptop surface; kept as the deployment target. Pick one and give the consequence. Note
     that the Worker serves the PWA as static assets from apps/web/dist today, so deleting it
     changes what the Worker ships.
  5. Ordering that keeps the app usable throughout. The owner must be able to open something
     and act on it after each step, not only at the end.
  6. What remains unverifiable without the owner's phone, stated as a list.
  7. A one-page risk register: the three or four things most likely to make this fail, each
     with the cheapest early test that would reveal it.

HOW TO THINK

  The owner's target is a fully working, comfortable, secure app they can use daily. Comfort
  and security are both requirements, not trade-offs to be resolved later by someone else.

  Prefer the smallest change that makes the native app real. The three blockers are security
  decisions, so take the conservative option unless you can show the other is equally safe.

  A passing test proves nothing about behaviour. Three defects in this project were found
  only by real device testing after every automated check had passed, and two more were
  inside the evidence tooling itself. Where you cannot verify something, write unverified.

  Do not invent APIs, versions or platform capabilities. If a decision depends on a Cloudflare
  or Android behaviour you cannot confirm from the repo, say so and name what to check.

HARD LIMITS

  One owner. No registration, no sharing, no public personal-data endpoint.
  Raw notification text, chat exports, quotations and raw-content hashes never leave
  Android/Linux. Not to the Worker, D1, public assets, cloud object storage, crash reports
  or cloud backups.
  Every AI-derived task needs explicit owner approval before any canonical mutation.
  Never weaken an approval, privacy or dual-ingestion rule to make a plan tidier.
  No new dependency in this session. If the plan requires one, name it and justify it, but do
  not add it.
  Do not push, deploy or provision anything.

DELIVERABLE

  One document, docs/PLAN-NATIVE.md, and no other changes. It must be readable by an owner
  who is not a Kotlin developer: short sentences, decisions first, alternatives after.

REPORT

  State the three decisions plainly at the top. Then list every assumption you could not
  verify, and every question the owner must answer before implementation starts.

DO NOT
  Write application code. Do not modify the Worker, the PWA or the Android module. Do not
  mark any milestone complete. Do not claim device, account or provider verification.
```
