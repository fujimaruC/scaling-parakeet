# Next-model handoff — Academic OS v0.2

Planning is ready. No application has been built. Use an isolated working branch and begin **M0 only**. Do not call device/account gates complete using mocks.

## Paste this prompt into the next model

> Work in the scaling-parakeet repository. Read AGENTS.md, README.md, docs/16-OWNER-DECISIONS.md, docs/00-MASTER-PRD.md, docs/09-IMPLEMENTATION.md, docs/17-WORK-PACKAGES.md, docs/STATUS.md and docs/DECISIONS.md, then the relevant architecture/privacy/Android/transport/API/test contracts. Implement M0 packages W00–W03 incrementally. Academic and organizational responsibilities are equal. Both Android notification listener and manual export import are mandatory MVP paths. The actual Android 9 listener, filtering, encrypted queue, private remote phone→Linux receipt and recovery must be tested; prepare an owner-run kit if the device is unavailable, clearly leaving the gate blocked. Keep raw exports exclusively on Linux and raw notifications/evidence on Android/Linux. Only minimized structured proposals/tasks may sync to cloud. Every AI-extracted task requires explicit owner approval. External AI requires named provider/route consent. Use React/TS static PWA, TypeScript Worker/D1, Python collector and Kotlin companion as recommended choices, verifying compatible versions. Prefer private Tailscale/WireGuard connectivity as a feasibility candidate, not as an already approved vendor. Existing cloud tasks/reminders cannot depend on Linux or 9Router. $0 is preferred; propose justified paid options without activating billing. Linked-device/Baileys work is research only: do not link an account or implement a third adapter. Create runnable synthetic scaffolding, minimal migrations/contracts/tests and device/privacy/auth feasibility evidence. Keep missing physical/account tests visible. Update STATUS with exact commands/results, ADRs and the next smallest work package. Stop at the M0 boundary and report ready/blocked; do not silently proceed into all milestones or deploy real data.

## Expected M0 deliverables

- Runnable JS/Python/Kotlin skeletons and documented actual check commands.
- Local D1 migration smoke test and shared schema validation adapters.
- Synthetic Android probe APK/source and sanitized real-device test record, or owner-run instructions with explicit blocker.
- Private remote transfer prototype and interrupted-ack proof, actual-phone gate separately recorded.
- Cloud owner/collector auth design + negative tests; deployed account proof only if available/authorized.
- Provider consent/projection design and synthetic 9Router smoke result if owner's endpoint accessible.
- Linked-device research ADR with no enrollment/runtime implementation.
- STATUS and decision updates; no claim of completed MVP.

## Continuation

After M0, owner may authorize M1 or a longer scope. Follow M1→M4 with package verification; M5 is conditional LMS work. Preserve existing working code and current branch changes. Final target is functioning tested software, not mock UI. Real-device/privacy/auth failures block release even if independent development proceeds.

## Planning baseline

Base repository commit: `293525f96a473fcbcab9026df58e16d17a18d59a`. Planning branch: `docs/academic-os-v02-planning`. The local planning work has not been pushed unless a subsequent explicit status entry says otherwise. Read current git status before edits; do not assume the user's machine has these unpushed files.
