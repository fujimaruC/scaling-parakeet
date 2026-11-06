"""Reproducible synthetic fault checks; no adb/device needed; restore in finally."""
from pathlib import Path
import argparse,subprocess,fcntl
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
 lock=(ROOT/'.git/evidence-mutations.lock').open('w')
 try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:raise SystemExit('Another evidence mutation run is active')
 p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();a.output_dir.mkdir(parents=True,exist_ok=True)
 for name,file,before,after,pattern in CASES:
  path=ROOT/file;original=path.read_bytes();assert original.decode().count(before)==1,name
  def run(state):
   cmd=['.venv/bin/python','-X','pycache_prefix='+str(a.output_dir/(name+'-'+state+'-cache')),'-m','unittest','discover','-s','collectors/local/tests','-p',pattern,'-v']
   with (a.output_dir/(name+'-'+state+'.log')).open('w') as log:r=subprocess.run(cmd,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT)
   print(name,state,'exit',r.returncode,flush=True);return r.returncode
  assert run('baseline')==0,'Nonpassing baseline: '+name
  try:
   path.write_text(original.decode().replace(before,after));assert run('broken')!=0,name
   assert 'FAIL:' in (a.output_dir/(name+'-broken.log')).read_text(), 'Unexpected failure rather than assertion: '+name
  finally:path.write_bytes(original)
  assert run('restored')==0,name
 print('PASS: '+str(len(CASES))+' faults failed and '+str(len(CASES))+' restored runs passed; sources restored.')
if __name__=='__main__':main()
