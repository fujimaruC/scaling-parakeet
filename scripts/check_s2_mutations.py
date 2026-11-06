"""Reproducible S2 fault checks. Synthetic processes only; never invoke adb."""
from pathlib import Path
import argparse,fcntl,os,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
UNIT=['npx','vitest','run','tests/s2.test.ts']
API=['npx','vitest','run','tests/integration/ledger.test.ts','-t','read detail scopes']
FLOW=['npx','playwright','test','tests/e2e/s2.spec.ts','--grep','read-only routes']
A11Y=['npx','playwright','test','tests/e2e/s2.spec.ts','--grep','360px']
CASES=[
 ('live-markers','scripts/device_evidence.py',"'brief','AOS-RUN:I'","'brief','-T','1','AOS-RUN:I'",[sys.executable,'-m','unittest','discover','-s','collectors/local/tests','-p','test_device_evidence.py','-v']),
 ('distinct-precision','apps/web/src/read/model.ts',"if (d.precision === 'approximate') return w.approx;","if (d.precision === 'approximate') return w.nodate;",UNIT),
 ('owner-calendar','apps/web/src/read/model.ts','const today = localDay(now, zone),',"const today = localDay(now, 'UTC'),",UNIT),
 ('date-only-order','apps/web/src/read/model.ts',"t.due.precision === 'date_only'\n            ? '~'","t.due.precision === 'date_only'\n            ? '00:00:00'",UNIT),
 ('scoped-history','apps/worker/src/index.ts','FROM task_events WHERE task_id=?','FROM task_events WHERE task_id<>?',API),
 ('effective-policy','apps/worker/src/index.ts','reminder_policy: effectiveReminderPolicy(settings),','reminder_policy: {enabled:true,offset_hours:[24,3],date_only_hour:9},',API),
 ('read-only','apps/web/src/main.tsx','const openTask = (task: any) => {',"const openTask = (task: any) => { void fetch('/api/v1/tasks/'+task.id,{method:'PATCH',body:'{}'});",FLOW),
 ('layered-history','apps/web/src/read/location.ts',"history[replace ? 'replaceState' : 'pushState']", "history['replaceState']",FLOW),
 ('modal-sheet','apps/web/src/read/Sheet.tsx','el.showModal();','el.show();',FLOW),
 ('visible-clock','apps/web/src/read/clock.ts','timer = setInterval(tick, 30000);','timer = setInterval(() => {}, 30000);',FLOW),
 ('text-contrast','apps/web/src/read/read.css','--urgent-text: #b73421;','--urgent-text: #ffffff;',A11Y),
 ('always-undated','apps/web/src/read/Ledger.tsx','className="s2-unknown"','hidden={allGroups.undated.length===0} className="s2-unknown"',UNIT),
 ('aggregate-pending','apps/web/src/main.tsx','<b>{briefing.pending}</b>','<b>{candidates.length}</b>',FLOW),
 ('undated-filter','apps/web/src/read/Ledger.tsx',"setFilter('all');",'', ['npx','playwright','test','tests/e2e/s2.spec.ts','--grep','keeps partial']),
 ('unavailable-context','apps/web/src/read/Ledger.tsx','t.context_id ? w.contextUnavailable : w.personal','w.personal',UNIT),
 ('read-auth-clear','apps/web/src/main.tsx','if ([401, 403].includes(e.status)) clearReadSession();','', ['npx','playwright','test','tests/e2e/s2.spec.ts','--grep','authorization denial']),
 ('exact-time-format','apps/web/src/read/model.ts',"timeStyle: 'short',\n          hourCycle: 'h23',\n          timeZone: 'UTC',","timeStyle: 'short',\n          timeZone: 'UTC',",UNIT),
 ('bounded-detail','apps/web/src/read/read.css','height: 100vh;\n  height: 100dvh;','height: auto;',A11Y),
 ('toast-hit-testing','apps/web/src/read/read.css','  pointer-events: none;','  pointer-events: auto;',FLOW),
 ('exact-instant-order', 'apps/web/src/read/model.ts', 'new Date(exactInstant(t)).toISOString()', "new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(exactInstant(t))", UNIT),
 ('unknown-done-group', 'apps/web/src/read/model.ts', "const key = !day\n      ? 'undated'\n      : task.status === 'done'\n        ? 'done'", "const key = task.status === 'done'\n      ? 'done'\n      : !day\n        ? 'undated'", UNIT),
 ('history-page-error', 'apps/web/src/read/Ledger.tsx', 'setHistoryError(true);', 'setError(true);', ['npx','playwright','test','tests/e2e/s2.spec.ts','--grep','history paging']),
]
def main():
 p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();out=a.output_dir.resolve()
 if out.is_relative_to(ROOT):p.error('use a synthetic output directory outside the checkout')
 out.mkdir(parents=True,exist_ok=True)
 lock=(ROOT/'.git/s2-mutations.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 print(f'Declared faults: {len(CASES)}',flush=True)
 for name,file,old,new,command in CASES:
  path=ROOT/file;original=path.read_bytes();content=original.decode();assert content.count(old)==1,(name,'anchor changed')
  def run(phase):
   cmd=list(command)
   if cmd[0]==sys.executable:cmd[1:1]=['-X','pycache_prefix='+str(out/(name+'-'+phase+'-cache'))]
   r=subprocess.run(cmd,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
   (out/f'{name}-{phase}.log').write_bytes(r.stdout)
   print(f'{name} {phase}: exit {r.returncode}',flush=True)
   return r
  try:
   assert run('baseline').returncode==0,(name,'baseline failed')
   path.write_text(content.replace(old,new))
   broken=run('broken');clean=re.sub(rb'\x1b\[[0-9;]*[A-Za-z]',b'',broken.stdout)
   assert broken.returncode!=0 and (b'AssertionError' in clean or b'Error: expect(' in clean or (b'expect(received)' in clean and b'Expected:' in clean and b'Received:' in clean)),(name,'must fail an assertion, not setup')
  finally:path.write_bytes(original)
  assert run('restored').returncode==0,(name,'restoration failed')
 print(f'PASS: {len(CASES)} broken assertion failures; {len(CASES)} restored passes; sources restored.',flush=True)
if __name__=='__main__':main()
