# Fault runner triage — round 7

Fresh main base22577a96c23eb3c780cb2b00e6989cfc7450aeaa, 2026-11-11.
Every decision below is implemented source, **NOT RUN** at the owner's request.
A proposed timeout is not a measured completion time. The owner must run the
inventory and retain actual durations; no runtime promise is made here.

## Decisions on the seven formerly orphaned runners

| Runner | Decision | Protected behavior and why it stays | What changed |
|---|---|---|---|
| ack | Fix and wire in | Queued/delivered/applied, stale generations, durable receipt/purge and truthful evidence are separate guarantees. Removing this suite would leave unique negative checks. | Replace full npm test with exact ledger acknowledgment case; narrow local unittests. Fix a real ambiguous anchor: the old applied branch appeared twice. Private copies and hard time limits replace in-place unbounded calls. |
| s2 | Fix and wire in | Four date precisions, timezone ordering, scoped history/policy, modal/focus/navigation and partial/error disclosure remain product behavior after S3. | Preserve declared cases; invoke installed Vitest/Playwright directly, focus each unit/API target, use private copies and process-group timeouts. No npx download or full npm suite. Timeout/setup failure is not a successful mutation proof. |
| android | Fix and wire in | Keystore fingerprint/key-loss/legacy gate and the original AutoCloseable/API28/host-JDK class still need faults. | Source anchors were already actual Kotlin paths; the brief's build-target-anchor diagnosis was not borne out by reading this file. Fix isolation, outside-output refusal, baseline/broken/restored execution, explicit JDK property and bounds instead. |
| native | Fix and wire in | Native precision/unavailable/uncertain-write policies, API28 surface and credential/snooze boundaries are unique. | Source anchors were already Kotlin/Worker paths. Focus each Worker case, retain full API28 Gradle tasks, isolate copies, pass JDK explicitly and bound execution. No signing change. |
| evidence | Fix and wire in | Marker completeness, native fatal attribution, artifact/boot/process identity and signed matrix journals detect plausible false reports. | Focus the existing synthetic unittest for each fault; reject errors/zero tests; isolate and bound all phases. This is evidence-tool logic, never hardware evidence. |
| foundation | Fix and wire in | Imprecise urgency, system theme, local fonts and route reachability complement structural accessibility. | Focus targets and private-copy execution replace in-place edits/npx. Missing anchors and missing actual assertions fail closed. |
| owner-safety | Fix and wire in | Signing mismatch, retained data, skipped cases and missing markers protect the owner's install and truthful output. | Focus existing mocked tests, bound phases and require intended assertions. Never contacts adb or executes real install commands. |

No orphan runner was deleted. Keeping their distinct invariants is safer than
claiming that newer CSV/job suites subsume phone-evidence or API28 checks. All
remaining check_*_mutations.py files are listed in OWNER-VERIFY and the execution
registry; a new/unlisted/missing file fails inventory validation before any tests.

## Why one controller

The seven revised runners and round6 share a small standard-library controller.
It validates every anchor before launching tests, copies only source/fixtures,
and never mutates the working checkout. Each case runs baseline -> broken ->
restored with exact source bytes restored in finally. A nonzero command is not
proof: named Vitest assertions, Python FAIL/AssertionError, browser assertion
results or the explicit expected API28 compiler diagnostic must be present.
Zero/skipped tests, import failures, missing JSON reports and survivors fail.
A timeout kills the child process group and leaves an incomplete report.

The four historically verified runners remain independent. The master bounds
them too and gives one sequential entry point. This avoids a broad rewrite of
working fault definitions while making every runner discoverable/attributable.
Their existing baseline/broken/restored logs are preserved alongside the master's
per-suite output and summary. Rewritten suites also emit per-phase durations.

Per-command ceilings: Vitest120s, Python90s, browser180s, guard240s, Gradle300s;
effective timeout is the smaller of this and the remaining suite ceiling. Full
suite ceilings and requirements are in OWNER-VERIFY/fault_registry.py. The CI
job's240-minute cap includes setup and200 minutes of maximum suite ceilings.
These are conservative hard limits, not measured expected duration or evidence
that every suite finishes under load. The source-read observations of the old
ack >240s and s2 >14min come from the task brief, not a new benchmark here.

## Round6 highest-value additions

- Full canonical table parity and the actual11-term compound-SELECT regression.
  export-contract now asserts JSON HTTP200 before reading its tables, so that
  regression fails an assertion instead of a secondary TypeError.
- Selected export413 and repeated-selector refusal.
- Credential leakage through an accidentally widened canonical allowlist, plus
  a corrupted restore digest that independent test normalization must catch.
- No canonical write during proposal sync, explicit ITK projection review and
  no implicit queuing after successful synthetic extraction.
- Both promoted local gate scopes: wrong target, missing sentence and stale
  contradictory status. Baseline/restored paths execute both actual named tests.

The brief overstated part of the gap: check_contract_mutations.py already targets
export-contract and review-boundary. Round6 adds the missing concrete counterexamples
and provides a focused whole-slice entry point; it does not claim those files
previously had zero coverage. Some overlap is deliberate for approval/privacy.
Most Python modules are not exhaustively mutation-covered; only high-value
invariants are selected. Presence of a test file or fault declaration is not a
passing proof, and mocked evidence tools cannot close any physical gate.

## CI and dependencies

One dedicated fault-suites job runs the full registry sequentially with no matrix,
so browser cases cannot overlap on4173. Chromium is required by contract, round5,
s2 and foundation; built production assets by round4; Python lockfile by collector
and Python-encrypted D1 proofs; JDK17/SDK by android/native. Node is required for
Worker/Vitest and the synthetic router's local receiver. Install Python in .venv
before npm run check, because D1 restore invokes its encryptor. The old workflow
had the reverse order; that was an environment defect found by source inspection.

No npm/Python/Android dependency was added. New CI upload-artifact action retains
synthetic fault stdout/reports on failure for independent review; it is not an
application runtime dependency. No CI run, push, deployment or provisioning was
performed. Actual CI timing, new fault results and gate promotion remain unverified.
