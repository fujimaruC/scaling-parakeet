"""Synthetic faults in private temporary copies. Never mutate the real working tools."""
import argparse,fcntl,shutil,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CASES=[
 ('marker-substring','scripts/device_evidence.py',"marker=re.fullmatch(r'I/AOS-RUN\\s*\\(\\s*\\d+\\):\\s*'+re.escape(self.token)+r' (START|END)\\s*',line)","marker=re.search(re.escape(self.token)+r' (START|END)',line)"),
 ('pid-reuse','scripts/device_evidence.py','if len(names)>1:self.bad=True;self.target.discard(pid)','if False:self.bad=True;self.target.discard(pid)'),
 ('signing-bypass','scripts/device_evidence.py',"if safety['allowed'] is not True:","if False:"),
 ('retained-data-as-fresh','scripts/apk_safety.py'," paths=text.strip().splitlines()"," if rows and not text.strip():result['allowed']=True;return result\n paths=text.strip().splitlines()"),
 ('skipped-case-claimed','scripts/owner_device_run.py',"'owner_reported_ok':None","'owner_reported_ok':True"),
 ('missing-marker-case','scripts/owner_device_run.py',"if not window.started.is_set():raise Blocked('START_MARKER_UNAVAILABLE')","if False:raise Blocked('START_MARKER_UNAVAILABLE')"),
 ('unverified-readback-launch','scripts/device_evidence.py',"if apk is not None and safe['install_ok'] is not True:","if False:"),
]
def main():
 p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();a.output_dir=a.output_dir.resolve();a.output_dir.mkdir(parents=True,exist_ok=True)
 lock=(a.output_dir/'runner.lock').open('w')
 try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:raise SystemExit('MUTATION_RUN_ALREADY_ACTIVE')
 with tempfile.TemporaryDirectory(prefix='aos-evidence-fixture-') as directory:
  work=Path(directory)
  files=['scripts/device_evidence.py','scripts/apk_safety.py','scripts/owner_device_run.py','scripts/capture_matrix.py','collectors/local/tests/test_owner_safety.py']
  for name in files:
   target=work/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
  def run(name):
   cmd=[sys.executable,'-X','pycache_prefix='+str(a.output_dir/(name+'-cache')),'-m','unittest','discover','-s','collectors/local/tests','-p','test_owner_safety.py','-v']
   with (a.output_dir/(name+'.txt')).open('w') as out:r=subprocess.run(cmd,cwd=work,stdout=out,stderr=subprocess.STDOUT)
   print(name+': exit '+str(r.returncode),flush=True);return r.returncode
  if run('baseline'):raise RuntimeError('Baseline failed')
  for case in CASES:
   name,file,before,after=case[:4];path=work/file;original=path.read_bytes();assert original.decode().count(before)==1,name
   try:
    path.write_text(original.decode().replace(before,after))
    assert run(name+'-broken')!=0,name
    assert 'FAIL:' in (a.output_dir/(name+'-broken.txt')).read_text(),'Unexpected failure: '+name
   finally:path.write_bytes(original)
   assert run(name+'-restored')==0,name
  print(f'PASS: {len(CASES)} intended failures; {len(CASES)} restored passes; 0 survivors; working tools untouched.')
if __name__=='__main__':main()
