"""Private-copy fault proofs for the owner/verifier. NOT RUN in recovery delivery."""
import argparse,re,shutil,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CASES=[
 ('csv-byte-parity','apps/worker/src/export.ts',r"(\[\s*)'2\.0'(?=\s*,\s*at\s*,\s*table)",r"\1'wrong-version'",'stream','paged CSV is byte-identical'),
 ('csv-bounded-pages','apps/worker/src/export.ts',r'CSV_PAGE_ROWS = 256','CSV_PAGE_ROWS = 100000','stream','paged CSV is byte-identical'),
 ('csv-batch-bound','apps/worker/src/export.ts',r'CSV_PREFETCH_PAGES = 8','CSV_PREFETCH_PAGES = 16','stream','paged CSV is byte-identical'),
 ('csv-chunk-bound','apps/worker/src/export.ts',r'CSV_CHUNK_BYTES = 16 \* 1024','CSV_CHUNK_BYTES = 1024 * 1024','stream','paged CSV is byte-identical'),
 ('csv-snapshot-epoch','apps/worker/src/export.ts',r'!== revision','=== "impossible"','stream','a canonical write'),
 ('csv-stream-error','apps/worker/src/export.ts',r'controller\.error\([\s\S]*?\);','controller.close();','stream','page failures'),
 ('legacy-once-only','collectors/local/src/academic_os/pipeline.py',re.escape("return self._send_job(ident,manual=True,selection=(source,generation),legacy_only=True)"),"return self.get(ident) if self.get(ident)['state']=='synced' else self._send_job(ident,manual=True,selection=(source,generation),legacy_only=True)",'legacy','test_visible_legacy'),
 ('legacy-source','collectors/local/src/academic_os/pipeline.py',re.escape("if source!=job['source_id']:raise Invalid('JOB_SOURCE_MISMATCH')"),"if False:raise Invalid('JOB_SOURCE_MISMATCH')",'legacy','test_source_generation'),
 ('legacy-generation','collectors/local/src/academic_os/pipeline.py',re.escape("if not row or row[0]!=generation or job['payload'].get('envelope',{}).get('source_generation')!=generation:"),'if False:','legacy','test_source_generation'),
 ('legacy-no-auto-migration','collectors/local/src/academic_os/pipeline.py',re.escape('self.attempts.begin_legacy(ident)'),"self.attempts.begin_legacy(ident);self.attempts.prepare(ident,'sync')",'legacy','test_visible_legacy'),
 ('icon-accessible-name','apps/web/src/main.tsx',re.escape('aria-label={s.add}'),'data-unlabelled={s.add}','browser','structural accessibility en light'),
 ('brand-target','apps/web/src/design/foundation.css',r'(\.brand \{\s*)min-height: 44px;',r'\1min-height: 0;','browser','structural accessibility en light'),
]
def main():
 p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();out=a.output_dir.resolve()
 if out==ROOT or ROOT in out.parents:raise SystemExit('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY')
 out.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='aos-round5-faults-') as tmp:
  fixture=Path(tmp)
  for folder in ['apps','packages','tests','schemas','collectors','examples','scripts','docs']:
   shutil.copytree(ROOT/folder,fixture/folder,ignore=shutil.ignore_patterns('node_modules','dist','build','.gradle','.wrangler','__pycache__','*-checks'))
  (fixture/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
  for name in ['package.json','package-lock.json','playwright.config.ts','tsconfig.json','vitest.config.ts']:shutil.copy2(ROOT/name,fixture/name)
  def run(name,kind,pattern):
   if kind=='stream':cmd=[str(ROOT/'node_modules/.bin/vitest'),'run','tests/integration/export-stream.test.ts','-t',pattern]
   elif kind=='legacy':cmd=[sys.executable,'-m','unittest','discover','-s','collectors/local/tests','-p','test_legacy_jobs.py','-k',pattern,'-v']
   else:cmd=[str(ROOT/'node_modules/.bin/playwright'),'test','tests/e2e/accessibility.spec.ts','--grep',pattern,'--reporter=line']
   r=subprocess.run(cmd,cwd=fixture,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=180)
   (out/(name+'.txt')).write_text('COMMAND: '+' '.join(cmd)+'\n'+r.stdout+'\nEXIT: '+str(r.returncode)+'\n');return r
  for name,file,pattern,replacement,kind,test in CASES:
   path=fixture/file;original=path.read_text();changed,count=re.subn(pattern,replacement,original)
   if not count:raise SystemExit(name+' MISSING_FAULT_ANCHOR')
   if run(name+'-baseline',kind,test).returncode:raise SystemExit(name+' BASELINE_FAILED')
   try:
    path.write_text(changed);r=run(name+'-broken',kind,test)
    expected=('has no accessible name' if name=='icon-accessible-name' else 'target ') if kind=='browser' else 'AssertionError'
    if r.returncode==0 or expected not in r.stdout or any(x in r.stdout for x in ['SyntaxError','Transform failed','FAILED (errors=','Timed out waiting']):raise SystemExit(name+' DID_NOT_FAIL_INTENDED_ASSERTION')
   finally:path.write_text(original)
   if run(name+'-restored',kind,test).returncode:raise SystemExit(name+' RESTORED_FAILED')
   print(name+': intended assertion failure; restored PASS',flush=True)
 print(f'PASS: {len(CASES)} intended failures; {len(CASES)} restored passes; 0 survivors; working sources untouched.')
if __name__=='__main__':main()
