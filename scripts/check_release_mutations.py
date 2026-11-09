"""Isolated synthetic assertion-failure proofs; never mutate working sources or use a device."""
import argparse, pathlib, shutil, subprocess, tempfile, sys, re
ROOT=pathlib.Path(__file__).resolve().parents[1]
# Each tuple names a real behavior, its implementation fault, and a focused regression.
CASES=[
 ('push-body','apps/worker/src/push.ts',"method: 'POST',","method: 'POST',body:'synthetic forbidden payload',",'release-gaps','push subscription lifecycle'),
 ('push-expiry','apps/worker/src/push.ts',"if (state === 'expired')","if (false)",'release-gaps','expired endpoints'),
 ('push-unknown','apps/worker/src/push.ts',"state = 'unknown';","state = 'failed';",'release-gaps','ambiguous push failures'),
 ('push-endpoint','apps/worker/src/push.ts',"  if (typeof value !== 'string'", "  if(typeof value==='string')return true;\n  if (typeof value !== 'string'",'release-gaps','push is opt in'),
 ('budget-cap','apps/worker/src/operations.ts','out[0].results[0].requests > LIMITS[kind]','out[0].results[0].requests > 100000','release-gaps','persistent accounting'),
 ('health-unknown','apps/worker/src/operations.ts',"if (!reported) return 'never_reported';","if (!reported) return 'healthy';",'release-gaps','health never invents'),
 ('daily-health-count','apps/worker/src/operations.ts','daily_requests: daily?.requests ?? 0','daily_requests: 0','release-gaps','health daily count remains'),
 ('cron-failure','apps/worker/src/operations.ts',"cron?.state === 'failed'","false",'release-gaps','cron health reports actual'),
 ('search-page','apps/worker/src/task-list.ts','if (q) {','if (false) {','release-gaps','a year ledger'),
 ('calendar-range','apps/worker/src/task-list.ts','if (from || through) {','if (false) {','release-gaps','a year ledger'),
 ('cursor-scope','apps/worker/src/task-list.ts','c[1] !== scope','false','release-gaps','task cursors are bound'),
 ('history-end','apps/worker/src/history.ts','rows.results.length > limit','false','release-gaps','global history reaches'),
 ('generic-alert','apps/web/public/sw.js',"body:'Open Academic OS / Buka Academic OS'","body:event.data.text()",'push-worker','push renders a fixed'),
 ('generator-mode','scripts/create_vapid_secrets.mjs',"openSync(destination,'wx',0o600)","openSync(destination,'wx',0o644)",'generator','VAPID generator writes'),
 ('generator-repository','scripts/create_vapid_secrets.mjs',"if(destination===root||destination.startsWith(root+'/'))","if(false)",'generator','VAPID generator rejects'),
 ('click-origin','apps/web/public/sw.js',"new URL('/inbox',self.location.origin)","new URL(event.notification.data.path,self.location.origin)",'push-worker','notification click cannot'),
]
def main():
 p=argparse.ArgumentParser();p.add_argument('--output-dir',required=True,type=pathlib.Path);args=p.parse_args();args.output_dir.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='aos-release-faults-') as td:
  fixture=pathlib.Path(td)
  for path in ['apps','packages','tests','schemas','scripts']:
   shutil.copytree(ROOT/path,fixture/path,ignore=shutil.ignore_patterns('node_modules','dist','build','.gradle','.wrangler'))
  for path in ['package.json','package-lock.json','tsconfig.json','vitest.config.ts']:shutil.copy2(ROOT/path,fixture/path)
  (fixture/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
  def run(name,test,pattern):
   cmd=[str(ROOT/'node_modules/.bin/vitest'),'run','tests/integration/release-gaps.test.ts' if test=='release-gaps' else ('tests/unit/vapid-generator.test.ts' if test=='generator' else 'tests/unit/push-worker.test.ts'),'-t',pattern]
   done=subprocess.run(cmd,cwd=fixture,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=90)
   (args.output_dir/(name+'.txt')).write_text('COMMAND: '+' '.join(cmd)+'\n'+done.stdout)
   return done
  for name,file,old,new,test,pattern in CASES:
   target=fixture/file;original=target.read_text();assert original.count(old)==1,(name,original.count(old));assert run(name+'-baseline',test,pattern).returncode==0,name
   try:
    target.write_text(original.replace(old,new,1));broken=run(name+'-broken',test,pattern)
    assert broken.returncode!=0 and 'AssertionError' in broken.stdout and not re.search(r'Transform failed|Failed to load|SyntaxError',broken.stdout),name+' did not fail an assertion'
   finally:
    target.write_text(original)
    (fixture/'scripts/refused-test-key.json').unlink(missing_ok=True)
   assert run(name+'-restored',test,pattern).returncode==0,name
   print(name+': intended assertion failure; restored PASS',flush=True)
 print(f'PASS: {len(CASES)} intended failures; {len(CASES)} restored passes; 0 survivors; working sources untouched.')
if __name__=='__main__':main()
