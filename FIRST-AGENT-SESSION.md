# First agent session: recommended prompt and exit gates

Paste this into the coding agent **from the directory containing this package**:

> You are implementing Academic OS as my private, $0 incremental-cost personal academic planner. Read `AGENTS.md`, `README.md`, `docs/00-MASTER-PRD.md`, `docs/01-ARCHITECTURE.md`, `docs/07-SECURITY-PRIVACY.md`, `docs/08-OPERATIONS.md`, `docs/09-IMPLEMENTATION.md`, `docs/DECISIONS.md`, and `docs/STATUS.md`. Implement **Milestone 0 only** as the first vertical slice. Establish a small monorepo, synthetic data, local D1 migration and test harness, and a minimal authenticated deployment feasibility plan. Do not infer ITK Moodle APIs, automate personal WhatsApp, expose my 9Router, or commit secrets. Prefer static PWA and simple Worker API; keep Android 9/8 GB VAIO constraints in view. Produce tested code, update STATUS with exact evidence, and explain any unknown/broken requirements. Do not deploy to real public infra or handle real chat data until security gates pass.

## Expected files after first development session
- `apps/web/` minimal static PWA shell (no live personal data)
- `apps/worker/` Worker source + config + D1 migration
- `collectors/local/` Python project skeleton with synthetic fixture test
- `packages/contracts/` generated TS/Python contracts or schema validation adapters
- Git ignore secrets, sample config and basic CI/test commands
- Updated `docs/DECISIONS.md` framework/auth choice
- Updated `docs/STATUS.md` with actual commands and outcomes

## First-session exit criteria
- Cannot access private API anonymously in local/proposed deployment design.
- Synthetic unit tests pass locally; database migration reproducible.
- No paid cloud, upstream account changes or real personal data involved.
- Agent reports exactly what's verified vs not verified and doesn't move to M1 silently.
