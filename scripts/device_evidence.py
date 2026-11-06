"""Run locally with owner's adb. Strict projection; never print adb/logcat bodies."""
import argparse,json,re,subprocess,time,uuid

def adb(*args):
 try:return subprocess.run(['adb',*args],capture_output=True,text=True,timeout=15).stdout
 except (OSError,subprocess.TimeoutExpired):return ''
def collect():
 run=str(uuid.uuid4());records=[];observed=[]
 for i in range(2):
  token=str(uuid.uuid4())
  if i:adb('shell','input','keyevent','3')
  adb('shell','am','start','-n','id.academicos.companion/.MainActivity','--es','evidence_run',token)
  time.sleep(3)
  text=adb('logcat','-d','-s','AOS-EVIDENCE:I','*:S')
  current=[]
  for line in text.splitlines():
   try:
    record=json.loads(line[line.index('{'):])
    if record.get('run')==token:current.append(record)
   except (ValueError,TypeError):pass
  observed.append(bool(current) and bool(adb('shell','pidof','id.academicos.companion').strip()))
  records.extend(current)
 safe={'run':run,'source_commit':None,'apk_sha256':None,'repair_code':None,'owner_reset_performed':None,'install_ok':None,'fatal_exception_observed':None,'smoke_result':'unverified','capture':'not_run','transport':'not_run','key_loss_recovery':'not_run','backup_exclusion':'not_run'}
 # Both emissions originate from this command's random run, not stale log entries.
 safe['launch_stays_open']=observed[0];safe['reopen_ok']=observed[1]
 if records:
  r=records[-1]
  for k in ['notification_access','low_ram','repair_required']:
   safe[k]=r[k] if type(r.get(k)) is bool else None
  for k in ['android_api','queue_count','observed_gap_count']:
   safe[k]=r[k] if type(r.get(k)) is int and r[k]>=0 else None
  # Build strings only: bounded alphabet, no arbitrary extras or exception text.
  for k in ['device_model','device_build','version']:
   v=r.get(k);safe[k]=v if isinstance(v,str) and re.fullmatch(r'[A-Za-z0-9._ -]{1,120}',v) else None
 safe['unavailable']=[k for k,v in safe.items() if v is None]
 return safe

def main():
 p=argparse.ArgumentParser();p.add_argument('--samples',type=int,default=1);a=p.parse_args()
 if not 1<=a.samples<=120:p.error('samples must be 1..120')
 for i in range(a.samples):
  print(json.dumps(collect(),sort_keys=True),flush=True)
  if i+1<a.samples:time.sleep(10)
if __name__=='__main__':main()
