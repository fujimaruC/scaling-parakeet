"""Local-only observations. Never persist/print raw adb or logcat responses."""
import argparse,hashlib,json,re,subprocess,tempfile,threading,time,uuid,zipfile
from pathlib import Path
PKG='id.academicos.companion'
COMP=PKG+'/.MainActivity'
_serial=None

def command(*args):
 try:
  r=subprocess.run(['adb',*(['-s',_serial] if _serial else []),*args],capture_output=True,text=True,errors='replace',timeout=30)
  return r.returncode,r.stdout
 except (OSError,subprocess.TimeoutExpired):return None,''
def adb(*args):
 code,text=command(*args)
 return text if code==0 else ''
def resumed(text):
 return any(re.search(r'^\s*(?:mResumedActivity|topResumedActivity)\s*[:=].*\b'+re.escape(COMP)+r'(?:\s|\})',line) for line in text.splitlines())

def installed_artifact():
 """Read back the actual single installed APK; never hash the requested file alone."""
 lines=adb('shell','pm','path',PKG).strip().splitlines()
 if len(lines)!=1 or not re.fullmatch(r'package:/data/app/[A-Za-z0-9_./=+~-]+\.apk',lines[0]):return None,None
 with tempfile.TemporaryDirectory() as directory:
  local=Path(directory)/'installed.apk';code,_=command('pull',lines[0][8:],str(local))
  if code!=0 or not local.is_file():return None,None
  digest=hashlib.sha256(local.read_bytes()).hexdigest();commit=None
  try:
   with zipfile.ZipFile(local) as z:manifest=json.loads(z.read('assets/academic-os-build.json'))
   declared=manifest.get('source_commit')
   if manifest.get('source_dirty') is False and isinstance(declared,str) and re.fullmatch(r'[0-9a-f]{40}',declared):commit=declared
  except (ValueError,KeyError,OSError,zipfile.BadZipFile):pass
  return digest,commit

def install(apk,sdk=None):
 from apk_safety import check_update
 safety=check_update(apk,sdk)
 if safety['allowed'] is not True:return False if safety['allowed'] is False else None
 code,text=command('install','-r',str(apk))
 if code==0 and any(line.strip()=='Success' for line in text.splitlines()):return True
 if code is not None and (code!=0 or 'Failure [' in text):return False
 return None

MONITORED={'AOS-RUN','AndroidRuntime','DEBUG','libc'}
def chatty_parts(line):
 """(owner,tag) from a chatty suppression line. owner None=unparsable, tag None=not named.
 ponytail: assumes chatty names app uids by package name, as observed on ColorOS/API28.
 Pass the installed uid and compare numerically if a vendor renames it.
 """
 body=line.split('):',1)[1].strip() if '):' in line else ''
 m=re.fullmatch(r'uid=\d+\(([^)]*)\)\s+(.*)',body)
 if not m:return None,None
 owner,rest=m.groups()
 t=re.fullmatch(r'(?:lowpool\[\d+\]\s+)?([A-Za-z0-9_.:-]+)\s+identical \d+ lines?',rest)
 return owner,(t[1] if t else None)

class CrashWindow:
 """Live bounded stream, with both markers observed on the same stream.
 Missing markers/EOF/parser ambiguity means unknown, never crash-free.
 """
 def __init__(self):
  self.token=str(uuid.uuid4());self.started=threading.Event();self.ended=threading.Event();self.fatal=set();self.target=set();self.identified=set();self.bad=False;self.native=False;self.proc=None;self.names={}
 def feed(self,line):
  marker=re.fullmatch(r'I/AOS-RUN\s*\(\s*\d+\):\s*'+re.escape(self.token)+r' (START|END)\s*',line)
  if marker:
   if marker[1]=='START':
    if self.started.is_set():self.bad=True
    self.started.set()
   elif self.started.is_set():self.ended.set()
   return
  if not self.started.is_set() or self.ended.is_set():return
  if re.match(r'F/DEBUG\s*\(',line) and '>>> '+PKG+' <<<' in line:self.native=True
  if re.match(r'[EF]/(?:DEBUG|libc)\s*\(',line):self.bad=True
  if 'dropped' in line.lower() or line.startswith('logcat:'):self.bad=True
  elif re.search(r'/chatty\s*\(',line):
   # chatty names the owner and usually the suppressed tag. Only suppression of
   # our own monitored tags is lost evidence; another app's chatter is not.
   owner,tag=chatty_parts(line)
   if owner is None or owner==PKG:
    if tag is None or tag in MONITORED:self.bad=True
  m=re.match(r'[EF]/AndroidRuntime\s*\(\s*(\d+)\):\s*(.*)',line)
  if not m:
   if 'AndroidRuntime' in line:self.bad=True
   return
  pid,body=m.groups()
  if 'FATAL EXCEPTION:' in body:self.fatal.add(pid)
  identity=re.fullmatch(r'Process: ([A-Za-z0-9_.:]+), PID: '+pid+r'\s*',body)
  if identity:
   names=self.names.setdefault(pid,set());names.add(identity[1]);self.identified.add(pid)
   if len(names)>1:self.bad=True;self.target.discard(pid)
   elif identity[1]==PKG or identity[1].startswith(PKG+':'):self.target.add(pid)
 def start(self):
  try:self.proc=subprocess.Popen(['adb',*(['-s',_serial] if _serial else []),'logcat','-b','main','-b','crash','-v','brief','AOS-RUN:I','AndroidRuntime:E','DEBUG:F','libc:F','chatty:I','*:S'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,errors='replace')
  except OSError:return
  def read():
   try:
    for line in self.proc.stdout:self.feed(line)
   except Exception:self.bad=True
   finally:
    if not self.ended.is_set():self.bad=True
  self.thread=threading.Thread(target=read,daemon=True);self.thread.start()
  def errors():
   try:
    for line in self.proc.stderr:self.bad=True
   except Exception:self.bad=True
  self.errors_thread=threading.Thread(target=errors,daemon=True);self.errors_thread.start()
  adb('shell','log','-t','AOS-RUN',self.token+' START');self.started.wait(3)
 def stop(self):
  if self.proc:
   adb('shell','log','-t','AOS-RUN',self.token+' END');self.ended.wait(3)
   self.proc.terminate()
   try:self.proc.wait(timeout=3)
   except subprocess.TimeoutExpired:self.proc.kill();self.proc.wait()
   self.thread.join(timeout=3);self.errors_thread.join(timeout=3)
   if self.thread.is_alive() or self.errors_thread.is_alive():self.bad=True
  return self.result()
 def coverage_complete(self):
  return self.started.is_set() and self.ended.is_set() and not self.bad and not (self.fatal-self.identified)
 def result(self):
  if self.native or self.fatal & self.target:return True
  if self.coverage_complete():return False
  return None

def collect(apk=None,sdk=None):
 global _serial
 run=str(uuid.uuid4());records=[];observed=[];cold_pid=None
 safe={'run':run,'source_commit':None,'apk_sha256':None,'repair_code':None,'owner_reset_performed':None,'install_ok':None,'fatal_exception_observed':None,'smoke_result':'unverified','capture':'not_run','transport':'not_run','key_loss_recovery':'not_run','backup_exclusion':'not_run'}
 for key in ['launch_stays_open','reopen_ok','notification_access','low_ram','repair_required','android_api','queue_count','observed_gap_count','device_model','device_build','version']:safe.setdefault(key,None)
 code,serial=command('get-serialno')
 if code!=0 or not re.fullmatch(r'[A-Za-z0-9_.:-]{1,120}',serial.strip()) or serial.strip()=='unknown':
  safe.update({'launch_stays_open':None,'reopen_ok':None,'error_code':'DEVICE_NOT_IDENTIFIED'})
  safe['unavailable']=[k for k,v in safe.items() if v is None];return safe
 _serial=serial.strip()
 boot_code,boot=command('shell','cat','/proc/sys/kernel/random/boot_id')
 boot=boot.strip() if boot_code==0 and re.fullmatch(r'[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}',boot.strip()) else None
 # Begin monitoring before install/cold start so early crashes are not lost.
 monitor=CrashWindow();monitor.start()
 try:
  if apk is not None:
   safe['install_ok']=install(apk,sdk)
   if safe['install_ok'] is not True:
    safe.update(launch_stays_open=None,reopen_ok=None,error_code='INSTALL_NOT_CONFIRMED');return safe
  before_digest,before_commit=installed_artifact()
  if apk is not None and safe['install_ok'] is True:
   safe['install_ok']=None if before_digest is None else before_digest==hashlib.sha256(Path(apk).read_bytes()).hexdigest()
  if apk is not None and safe['install_ok'] is not True:
   safe.update(launch_stays_open=None,reopen_ok=None,error_code='INSTALL_READBACK_UNVERIFIED');return safe
  stop_code,_=command('shell','am','force-stop',PKG)
  pid_code,pid_text=command('shell','pidof',PKG)
  stopped=stop_code==0 and pid_code==1 and not pid_text.strip()
  for i in range(2):
   token=str(uuid.uuid4())
   if i:adb('shell','input','keyevent','3')
   adb('shell','am','start','-n',COMP,'--es','evidence_run',token)
   current=[];ok=False
   # ColorOS may intercept the first launch. Bounded retries, no false failure from a single delay.
   for attempt in range(4):
    time.sleep(2)
    text=adb('logcat','-d','-s','AOS-EVIDENCE:I','*:S')
    for line in text.splitlines():
     try:
      r=json.loads(line[line.index('{'):])
      if r.get('run')==token:current.append(r)
     except (ValueError,TypeError):pass
    pid_text=adb('shell','pidof',PKG).strip()
    alive=bool(re.fullmatch(r'\d+(?:\s+\d+)*',pid_text))
    ok=alive and resumed(adb('shell','dumpsys','activity','activities')) and stopped and (bool(current) if i==0 else bool(current) or (cold_pid==pid_text and bool(records)))
    if ok:break
    if attempt<3:adb('shell','am','start','-n',COMP,'--es','evidence_run',token)
   if i==0 and ok:cold_pid=pid_text
   observed.append(True if ok else None);records.extend(current)
  boot_end_code,boot_end=command('shell','cat','/proc/sys/kernel/random/boot_id')
  if not boot or boot_end_code!=0 or boot_end.strip()!=boot:observed=[None,None]
  safe['launch_stays_open'],safe['reopen_ok']=observed
  after_digest,after_commit=installed_artifact()
  if before_digest and before_digest==after_digest:
   safe['apk_sha256']=after_digest
   if before_commit==after_commit:safe['source_commit']=after_commit
  if records:
   r=records[-1]
   for k in ['notification_access','low_ram','repair_required']:
    safe[k]=r[k] if type(r.get(k)) is bool else None
   for k in ['android_api','queue_count','observed_gap_count']:
    safe[k]=r[k] if type(r.get(k)) is int and r[k]>=0 else None
   for k in ['device_model','device_build','version']:
    v=r.get(k);safe[k]=v if isinstance(v,str) and re.fullmatch(r'[A-Za-z0-9._ -]{1,120}',v) else None
 finally:
  safe['fatal_exception_observed']=monitor.stop()
  safe['crash_window_started']=monitor.started.is_set() if hasattr(monitor,'started') else None
  safe['crash_window_ended']=monitor.ended.is_set() if hasattr(monitor,'ended') else None
  safe['crash_coverage_complete']=monitor.coverage_complete() if hasattr(monitor,'coverage_complete') else None
 safe['unavailable']=[k for k,v in safe.items() if v is None]
 return safe

def main():
 p=argparse.ArgumentParser();p.add_argument('--samples',type=int,default=1);p.add_argument('--apk',type=Path);p.add_argument('--sdk',type=Path);a=p.parse_args()
 if not 1<=a.samples<=120:p.error('samples must be 1..120')
 if a.apk is not None and not a.apk.is_file():p.error('APK must exist locally')
 for i in range(a.samples):
  record=collect(a.apk if i==0 else None,a.sdk)
  print(json.dumps(record,sort_keys=True),flush=True)
  if record.get('error_code') or (a.apk is not None and i==0 and record.get('install_ok') is not True):raise SystemExit(2)
  if i+1<a.samples:time.sleep(10)
if __name__=='__main__':main()
