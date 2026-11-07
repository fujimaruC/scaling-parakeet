# S3–S7 verification-agent handoff

This package is an implementation/build handoff, NOT a verified release. The
owner explicitly reserved all tests for another agent. No tests, mutation runs,
browser rendering, visual baselines, accessibility audit or device session ran.
Compiler/bundler output is in BUILD-S3-S7. Earlier test counts/logs are historical.
No milestone is complete. notification_access=false; no listener event or capture
has ever run. Latest hardware crash-coverage field remains null/unverified.

## Reading order

AGENTS → design/UI-DESIGN-AGENT → DECISIONS ADR-021/022/023 → STATUS →
VERIFICATION-LOG → BUILD-S3-S7 → 02-DATA-MODEL → 10-API-CONTRACTS →
07-SECURITY-PRIVACY → DEVICE-SMOKE. Source is based on 6de38fd with the validated
S2 patch restored first. The owner explicitly waived intermediate slice stops and
test execution for the implementation agent, not correctness/privacy rules.

## Verify before real use

Run the existing acceptance suite in an isolated checkout. Read/update S2-only
readonly assumptions and selectors to assert the new writes, rather than skipping
or weakening them. No current passing counts are supplied. Reproduce actual
counts yourself. Historical S2 mutation/render scripts target that historical
slice and must not be presented as S3–S7 coverage without adaptation.

```bash
npm ci
npm run check
npm run test:e2e
npm run test:pwa
python3 -m venv .venv
.venv/bin/pip install -r collectors/local/requirements.lock -r requirements-docs.txt
.venv/bin/pip install -e collectors/local
.venv/bin/python scripts/validate_planning.py
.venv/bin/python -m unittest discover -s collectors/local/tests -v
cd apps/android-companion
./gradlew assembleDebug lint testDebugUnitTest
```

Native prerequisites remain JDK17, SDK28/35 and build-tools35.0.0. Do not claim an
Android build/device check for this package; Android code was not changed here.
Use synthetic data only. Never ask for real credentials in shared chat.

## Targeted verification work

1. Apply migration 0006 on a disposable migrated D1. Exercise owner/collector/
   anonymous authorization, origin checks, CAS rollback and idempotency collisions.
   Keep existing generation, approval, raw-data and reminder guards intact.
2. Task completion/undo-completion/quick-add/four date precisions/full edit/delete:
   real Worker data, pending check versus canonical groups/counts, definite failure
   rollback, committed response lost, reload, same-body/version/key retry, repeated
   retry, later edit, quota/storage failure, 401/403, logout and second-tab logout.
   No background writes on reconnect. A pending create blocks a replacement.
3. Review new/conflict/unknown/issues/non-task promotion; explicit target search
   beyond page one; missing evidence; genuine pointer threshold/vertical cancel/
   pointercancel; buttons; held/modified keys; dialog focus; no input-key approval.
   Date edits alone must not accept. Check gesture behavior with native text
   selection and both touch/mouse. Compensating Undo must append history, restore
   prior evidence/deadline, and create future-only reminders. New-task undo leaves
   a tombstone. Reject without selected target must not invent a task association.
4. Undo races: newer task/candidate/settings-reminder edit; another review; purge
   of the current or a previously supporting source; removed evidence; repeated
   compensation; interrupted/committed-lost-response replay. Verify inverse/audit
   scrubbing and purge after a new-task Undo. Check backup allowlists exclude
   review_effects and restore cannot revive historical Undo capability.
5. Seed at least a full year/1500 structured synthetic tasks. Calendar month
   paging, late pages, source/owner timezone boundaries, DST gaps/folds and skipped
   midnight, all-day versus exact dates, no date/approximate separation, browser
   Back/deep links, context/title query after first global100, empty/loading/
   unavailable/partial states. Never infer unloaded counts as zero.
6. Compiled-PWA offline reload, fonts/icons, snapshot time, last observed task
   detail/policy/history/proposal/inbox, unavailable unvisited month/detail,
   Cache Storage exclusion of API/Access/personal navigation, login HTML served
   at a static URL, per-build cache updates, generation-change refresh, cache
   invalidation after purge/mutations, auth loss and cross-tab logout. Verify a
   saved pending write is never sent automatically by SW/reconnect.
7. ID/EN, both themes, 360px, 200% text, real button/AX names, targets/focus,
   modal trap/return/Escape/backdrop/Back, reduced motion and haptic no-op. Capture
   new synthetic visual review baselines for every card type/sheet/screen; no
   golden or accessibility pass is asserted here. Use real screen-reader/device
   evidence only when available, otherwise record unverified.
8. Add meaningful regressions/fault cases for the new guarantees. Show real
   failing-with-fix-reverted then restored-passing output. Run fault runners
   sequentially in isolated trees with finally restoration. Do not reuse old
   count claims or treat a compile as runtime proof.

## Deliberately retained limits

Actual capture, private transport/reconnect, Web Push/account/provider/production
D1/Access, actual Chrome138/TalkBack, visual acceptance and full accessibility
remain unverified. Android icon/resources/theme and its outstanding accessibility
work were not implemented by these web slices. No physical APK is included.
Linux automatic AI-job retry scheduling and other pre-existing release gates
remain open. Root Today/groups describe bounded loaded tasks; aggregate pending
comes from briefing and is not guessed offline. Calendar/query navigation is
paged, not a claim of measured large-ledger performance. Existing bounded global
history/inbox endpoints remain bounded; no new all-history export/search promise.

Do not push, deploy, provision, weaken approval/privacy, or add dependencies.
Report actual defects and outcomes, update STATUS/VERIFICATION, and keep every
missing observation unverified. The source/patch ZIP parity is packaging integrity,
not an application test.
