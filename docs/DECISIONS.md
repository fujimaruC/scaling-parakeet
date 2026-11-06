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
