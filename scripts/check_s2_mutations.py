"""Focused S2 semantics/API/browser proofs; no full npm test or npx.
NOT RUN in builder workspace. Ceilings are policy, not measured duration.
"""
from mutation_harness import Case, run_suite

BUDGET_SECONDS = 1200
CASES = [
    Case('live-markers', 'scripts/device_evidence.py', "'brief','AOS-RUN:I'", "'brief','-T','1','AOS-RUN:I'", 'python', 'test_device_evidence.py', 'test_live_command_receives_its_own_markers', ''),
    Case('distinct-precision', 'apps/web/src/read/model.ts', "if (d.precision === 'approximate') return w.approx;", "if (d.precision === 'approximate') return w.nodate;", 'vitest', 'tests/s2.test.ts', 'calendar grouping keeps four precisions', ''),
    Case('owner-calendar', 'apps/web/src/read/model.ts', 'const today = localDay(now, zone),', "const today = localDay(now, 'UTC'),", 'vitest', 'tests/s2.test.ts', 'grouping uses owner calendar', ''),
    Case('date-only-order', 'apps/web/src/read/model.ts', "t.due.precision === 'date_only'\n            ? '~'", "t.due.precision === 'date_only'\n            ? '00:00:00'", 'vitest', 'tests/s2.test.ts', 'calendar grouping keeps four precisions', ''),
    Case('scoped-history', 'apps/worker/src/index.ts', 'FROM task_events WHERE task_id=?', 'FROM task_events WHERE task_id<>?', 'vitest', 'tests/integration/ledger.test.ts', 'read detail scopes', ''),
    Case('effective-policy', 'apps/worker/src/index.ts', 'reminder_policy: effectiveReminderPolicy(settings),', 'reminder_policy: {enabled:true,offset_hours:[24,3],date_only_hour:9},', 'vitest', 'tests/integration/ledger.test.ts', 'read detail scopes', ''),
    Case('read-only', 'apps/web/src/main.tsx', 'const openTask = (task: any) => {', "const openTask = (task: any) => { void fetch('/api/v1/tasks/'+task.id,{method:'PATCH',body:'{}'});", 'browser', 'tests/e2e/s2.spec.ts', 'S2 read-only routes', ''),
    Case('layered-history', 'apps/web/src/read/location.ts', "history[replace ? 'replaceState' : 'pushState']", "history['replaceState']", 'browser', 'tests/e2e/s2.spec.ts', 'S2 read-only routes', ''),
    Case('modal-sheet', 'apps/web/src/read/Sheet.tsx', 'el.showModal();', 'el.show();', 'browser', 'tests/e2e/s2.spec.ts', 'S2 read-only routes', ''),
    Case('visible-clock', 'apps/web/src/read/clock.ts', 'timer = setInterval(tick, 30000);', 'timer = setInterval(() => {}, 30000);', 'browser', 'tests/e2e/s2.spec.ts', 'S2 read-only routes', ''),
    Case('text-contrast', 'apps/web/src/read/read.css', '--urgent-text: #b73421;', '--urgent-text: #ffffff;', 'browser', 'tests/e2e/s2.spec.ts', 'S2 360px', ''),
    Case('always-undated', 'apps/web/src/read/Ledger.tsx', 'className="s2-unknown"', 'hidden={allGroups.undated.length===0} className="s2-unknown"', 'vitest', 'tests/s2.test.ts', 'Today keeps its undated navigation', ''),
    Case('aggregate-pending', 'apps/web/src/main.tsx', '<b>{briefing.pending}</b>', '<b>{candidates.length}</b>', 'browser', 'tests/e2e/s2.spec.ts', 'S2 read-only routes', ''),
    Case('undated-scroll', 'apps/web/src/read/Ledger.tsx', "if (group === 'undated' && page === 'tasks' && filter === 'all' && !search)", 'if (false)', 'browser', 'tests/e2e/s2.spec.ts', 'S2 keeps partial', ''),
    Case('unavailable-context', 'apps/web/src/read/Ledger.tsx', 't.context_id ? w.contextUnavailable : w.personal', 'w.personal', 'vitest', 'tests/s2.test.ts', 'Today keeps its undated navigation', ''),
    Case('read-auth-clear', 'apps/web/src/main.tsx', 'if ([401, 403].includes(e.status)) clearReadSession();', '', 'browser', 'tests/e2e/s2.spec.ts', 'S2 authorization denial', ''),
    Case('exact-time-format', 'apps/web/src/read/model.ts', "timeStyle: 'short',\n          hourCycle: 'h23',\n          timeZone: 'UTC',", "timeStyle: 'short',\n          timeZone: 'UTC',", 'vitest', 'tests/s2.test.ts', 'grouping uses owner calendar', ''),
    Case('bounded-detail', 'apps/web/src/read/read.css', 'height: 100vh;\n  height: 100dvh;', 'height: auto;', 'browser', 'tests/e2e/s2.spec.ts', 'S2 360px', ''),
    Case('toast-hit-testing', 'apps/web/src/read/read.css', '  pointer-events: none;', '  pointer-events: auto;', 'browser', 'tests/e2e/app.spec.ts', 'organization context', ''),
    Case('exact-instant-order', 'apps/web/src/read/model.ts', 'new Date(exactInstant(t)).toISOString()', "new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(exactInstant(t))", 'vitest', 'tests/s2.test.ts', 'grouping uses owner calendar', ''),
    Case('unknown-done-group', 'apps/web/src/read/model.ts', "const key = !day\n      ? 'undated'\n      : task.status === 'done'\n        ? 'done'", "const key = task.status === 'done'\n      ? 'done'\n      : !day\n        ? 'undated'", 'vitest', 'tests/s2.test.ts', 'grouping uses owner calendar', ''),
    Case('history-page-error', 'apps/web/src/read/Ledger.tsx', 'setHistoryError(true);', 'setError(true);', 'browser', 'tests/e2e/s2.spec.ts', 'S2 history paging', ''),
]

if __name__ == "__main__":
    run_suite('s2', CASES, BUDGET_SECONDS)
