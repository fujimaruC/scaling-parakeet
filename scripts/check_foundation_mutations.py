"""Run exactly declared S1 synthetic faults, restore bytes even on failure."""
from pathlib import Path
import argparse
import subprocess
import re
import fcntl
ROOT=Path(__file__).resolve().parents[1]
CASES=[
 ('imprecise-urgency','apps/web/src/pixel/UrgencyBar.tsx',"precision !== 'datetime' ||",'', ['npx','vitest','run','tests/foundation.test.ts']),
 ('frozen-system-theme','apps/web/src/design/theme.ts',"media.addEventListener('change', apply);",'', ['npx','playwright','test','tests/e2e/foundation.spec.ts','--grep','fonts stay local']),
 ('missing-local-fonts','apps/web/src/design/tokens.css',"src: url('/fonts/pixelifysans.woff') format('woff');", "src: url('/fonts/missing.woff') format('woff');", ['npx','playwright','test','tests/e2e/foundation.spec.ts','--grep','fonts stay local']),
 ('hidden-secondary-routes','apps/web/src/main.tsx','{nav.map((p) => (','{nav.slice(0, 4).map((p) => (', ['npx','playwright','test','tests/e2e/foundation.spec.ts','--grep','secondary workflows']),
]
def main():
 p=argparse.ArgumentParser();p.add_argument('--output-dir',required=True);args=p.parse_args()
 output=Path(args.output_dir).resolve();output.mkdir(parents=True,exist_ok=True)
 lock=(ROOT/'.git/foundation-mutations.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 print(f'Declared faults: {len(CASES)}',flush=True)
 for name,file,old,new,command in CASES:
  path=ROOT/file;original=path.read_bytes();text=original.decode()
  assert text.count(old)==1,(name,'mutation anchor changed')
  def run(phase):
   r=subprocess.run(command,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
   (output/f'{name}-{phase}.log').write_bytes(r.stdout)
   print(f'{name} {phase}: exit {r.returncode}',flush=True)
   return r
  try:
   assert run('baseline').returncode==0
   path.write_text(text.replace(old,new))
   broken=run('broken')
   clean=re.sub(rb'\x1b\[[0-9;]*[A-Za-z]',b'',broken.stdout)
   assert broken.returncode!=0 and (b'AssertionError' in clean or b'Error: expect(' in clean), 'must fail an assertion, not setup'
  finally: path.write_bytes(original)
  assert run('restored').returncode==0
 print(f'PASS: {len(CASES)} broken runs failed, {len(CASES)} restored runs passed; source restored.')
if __name__=='__main__':main()
