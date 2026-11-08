"""Synthetic faults in private temporary copies. Never mutate the real working tools."""
import argparse,fcntl,shutil,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CASES=[
 ('issued-install','scripts/device_evidence.py',"if code==0 and any(line.strip()=='Success' for line in text.splitlines()):","if True:",'test_device_evidence.py'),
 ('historical-activity','scripts/device_evidence.py',"return any(re.search(","return COMP in text or any(re.search(",'test_device_evidence.py'),
 ('truncated-crash','scripts/device_evidence.py',"if self.native or self.fatal & self.target:return True","if False:return True",'test_device_evidence.py'),
 ('missing-crash-boundary','scripts/device_evidence.py',"and self.ended.is_set() and not self.bad","and not self.bad",'test_device_evidence.py'),
 ('dirty-provenance','scripts/device_evidence.py',"manifest.get('source_dirty') is False","True",'test_device_evidence.py'),
 ('case-without-run','scripts/capture_matrix.py',"if elapsed<=0 or after.get('fatal_exception_observed') is not False:","if False:",'test_device_evidence.py'),
 ('edited-journal','scripts/capture_matrix.py',"not hmac.compare_digest(signature,hmac.new(key,canonical(row),hashlib.sha256).hexdigest())","False",'test_device_evidence.py'),
 ('replaced-installed-artifact','scripts/device_evidence.py','if before_digest and before_digest==after_digest:','if before_digest:','test_device_evidence.py'),
 ('leftover-warm-process','scripts/device_evidence.py','cold_pid==pid_text','True','test_device_evidence.py'),
 ('stale-boot','scripts/device_evidence.py','if not boot or boot_end_code!=0 or boot_end.strip()!=boot:','if not boot:','test_device_evidence.py'),
]
def main():
 p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();a.output_dir=a.output_dir.resolve();a.output_dir.mkdir(parents=True,exist_ok=True)
 lock=(a.output_dir/'runner.lock').open('w')
 try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:raise SystemExit('MUTATION_RUN_ALREADY_ACTIVE')
 with tempfile.TemporaryDirectory(prefix='aos-evidence-fixture-') as directory:
  work=Path(directory)
  files=['scripts/device_evidence.py','scripts/apk_safety.py','scripts/owner_device_run.py','scripts/capture_matrix.py','collectors/local/tests/test_device_evidence.py']
  for name in files:
   target=work/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
  def run(name):
   cmd=[sys.executable,'-X','pycache_prefix='+str(a.output_dir/(name+'-cache')),'-m','unittest','discover','-s','collectors/local/tests','-p','test_device_evidence.py','-v']
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
