"""Owner-run, local-only, sealed case journal. No manual PASS input."""
import re,argparse,hashlib,hmac,json,os,secrets,time,uuid
from pathlib import Path
from device_evidence import command,installed_artifact,CrashWindow,PKG,COMP,collect
CASES=('grant','revoke','selected_unselected','ambiguous_mapping','bundles_updates','hidden_muted','locked_battery','kill_reboot_force_stop','linux_off','interrupted_receipt','capacity_key_loss','backup_logs','remote_transfer')
def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':')).encode()
def verdict(case,before,after,elapsed):
 if after.get('fatal_exception_observed') is True:return 'FAIL'
 if elapsed<=0 or after.get('fatal_exception_observed') is not False:return 'UNVERIFIED'
 if not before.get('apk_sha256') or before['apk_sha256']!=after.get('apk_sha256'):return 'UNVERIFIED'
 if case=='grant' and before.get('notification_access') is False and after.get('notification_access') is True:return 'PASS'
 if case=='revoke' and before.get('notification_access') is True and after.get('notification_access') is False:return 'PASS'
 return 'UNVERIFIED'
def passive():
 code,text=command('shell','settings','get','secure','enabled_notification_listeners')
 permission=None
 if code==0 and (text.strip() in ('','null') or re.fullmatch(r'[A-Za-z0-9_.]+/[A-Za-z0-9_.$]+(?::[A-Za-z0-9_.]+/[A-Za-z0-9_.$]+)*',text.strip())):
  entries=text.strip().split(':');permission=any(x in (PKG+'/'+PKG+'.CaptureService',PKG+'/.CaptureService') for x in entries)
 digest,commit=installed_artifact()
 return {'notification_access':permission,'apk_sha256':digest,'source_commit':commit}
class Journal:
 def __init__(self,path):
  path=Path(path).resolve()
  repo=Path(__file__).resolve().parents[1]
  if path==repo or repo in path.parents:raise ValueError('Evidence must stay outside repository')
  path.mkdir(mode=0o700,parents=True,exist_ok=False)
  self.key=secrets.token_bytes(32);fd=os.open(path/'local-verification.key',os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
  with os.fdopen(fd,'wb') as f:f.write(self.key)
  self.file=(path/'record.jsonl').open('x');self.previous='';self.count=0
 def append(self,payload):
  row={'sequence':self.count,'previous':self.previous,'payload':payload}
  signature=hmac.new(self.key,canonical(row),hashlib.sha256).hexdigest()
  self.file.write(json.dumps({**row,'signature':signature},sort_keys=True)+'\n');self.file.flush();os.fsync(self.file.fileno())
  self.previous=signature;self.count+=1
 def finish(self):self.append({'kind':'sealed','events':self.count});self.file.close()
def verify(path):
 path=Path(path);key=(path/'local-verification.key').read_bytes();previous='';pending=None;cases=set();results=[];sealed=False
 lines=(path/'record.jsonl').read_text().splitlines()
 for i,line in enumerate(lines):
  row=json.loads(line);signature=row.pop('signature')
  if row['sequence']!=i or row['previous']!=previous or not hmac.compare_digest(signature,hmac.new(key,canonical(row),hashlib.sha256).hexdigest()):raise ValueError('Evidence modified')
  previous=signature;p=row['payload']
  if p['kind']=='begin':
   if pending or p['case'] not in CASES or p['case'] in cases:raise ValueError('Invalid case sequence')
   pending=p
  elif p['kind']=='end':
   if not pending or p['case']!=pending['case'] or p['token']!=pending['token']:raise ValueError('Case did not begin')
   results.append({'case':p['case'],'result':verdict(p['case'],pending['observation'],p['observation'],p['elapsed_ns'])});cases.add(p['case']);pending=None
  elif p['kind']=='sealed':
   if i!=len(lines)-1 or pending or p['events']!=i:raise ValueError('Incomplete journal')
   sealed=True
  else:raise ValueError('Invalid journal')
 if not sealed:raise ValueError('Incomplete journal')
 return results

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--verify',action='store_true');p.add_argument('--apk',type=Path);a=p.parse_args()
 if a.verify:
  try:print(json.dumps({'integrity':'verified','cases':verify(a.output)}))
  except (OSError,ValueError,KeyError):raise SystemExit('INCOMPLETE_OR_MODIFIED_EVIDENCE')
  return
 journal=Journal(a.output)
 try:
  # Install/build smoke remains observations, never a substitute for capture.
  smoke=collect(a.apk);print(json.dumps(smoke,sort_keys=True))
  for case in CASES:
   input('Case '+case+': Enter to begin; perform ONLY synthetic owner-controlled case. ')
   window=CrashWindow();window.start();before=passive();token=str(uuid.uuid4());start=time.monotonic_ns()
   journal.append({'kind':'begin','case':case,'token':token,'observation':before})
   try:input('Perform '+case+' on phone, then Enter to finish (no PASS labels accepted). ')
   finally:
    after=passive();after['fatal_exception_observed']=window.stop()
    journal.append({'kind':'end','case':case,'token':token,'observation':after,'elapsed_ns':time.monotonic_ns()-start})
  journal.finish();print(json.dumps({'integrity':'verified','cases':verify(a.output)},sort_keys=True))
 except BaseException:
  journal.file.close();raise
if __name__=='__main__':
 try:main()
 except KeyboardInterrupt:raise SystemExit('INCOMPLETE_EVIDENCE')
 except (OSError,ValueError,KeyError):raise SystemExit('EVIDENCE_UNAVAILABLE')
