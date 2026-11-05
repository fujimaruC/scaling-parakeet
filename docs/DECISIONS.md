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
