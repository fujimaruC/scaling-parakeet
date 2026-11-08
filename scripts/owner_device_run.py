#!/usr/bin/env python3
"""Owner-run observations, never a synthetic native PASS or a raw-log exporter."""
import argparse,getpass,hashlib,json,os,re,tempfile,time,uuid
from pathlib import Path
import device_evidence as d
from apk_safety import check_update
from capture_matrix import passive
CASES={
 'screen_usability':'Open the app, use Back and Capture, then return. Did the visible screen stay usable?',
 'capture_state_preserved':'Check only status/counts and existing pairing/mapping locally. Is there no unexplained change? Counts alone do not prove preservation.',
 'eight_surfaces':'With synthetic tasks, open Today, Tasks, detail, Review, Calendar, Settings, editor and date/quick panels. Are all usable?',
 'accessibility':'Try ID/EN, both themes, 200% font, keyboard and TalkBack. Are the controls readable and reachable?',
 'offline_recovery':'With synthetic tasks, disconnect/reopen/reconnect. Are cached/unavailable states honest, with no automatic write?',
 'pending_enrollment':'Use a fresh grant on the phone, but do not activate yet. Does the phone remain pending without ledger access? This is UI evidence only.',
 'activation':'Compare the entire fingerprint privately and activate that install in the trusted browser. Can the phone read real synthetic Worker tasks?',
 'revocation':'Revoke only this test install in the trusted browser, then refresh the phone. Is access denied and the task snapshot cleared, with Capture intact?',
 'expired_grant':'Only after a real five-minute unused grant expires, try it. Is enrollment rejected? Otherwise skip; changing the phone clock is not proof.',
 'expired_credential':'Only after the account reviewer expires a disposable test credential server-side, try a fresh request. Is it denied? Otherwise skip.',
}
SMOKE_KEYS={'run','source_commit','apk_sha256','repair_code','owner_reset_performed','install_ok','fatal_exception_observed','crash_coverage_complete','crash_window_started','crash_window_ended','smoke_result','capture','transport','key_loss_recovery','backup_exclusion','launch_stays_open','reopen_ok','notification_access','low_ram','repair_required','android_api','queue_count','observed_gap_count','device_model','device_build','version','unavailable','error_code'}

class Blocked(Exception):pass

def pin_device():
 code,text=d.command('get-serialno');serial=text.strip()
 if code!=0 or serial=='unknown' or not re.fullmatch(r'[A-Za-z0-9_.:-]{1,120}',serial):return False
 if d._serial is not None and d._serial!=serial:return False
 d._serial=serial;return True

def boot():
 code,text=d.command('shell','cat','/proc/sys/kernel/random/boot_id');text=text.strip()
 return text if code==0 and re.fullmatch(r'[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}',text) else None

def ask(prompt):
 # No freeform response is saved or echoed, including an accidentally pasted secret.
 while True:
  value=getpass.getpass(prompt+' [y=yes, n=no, s=skip] ').strip().lower()
  if value in ('y','n','s'):return {'y':True,'n':False,'s':None}[value]
  print('CHOOSE_Y_N_OR_S')

def save(path,record,first=False):
 path=Path(path).resolve();repo=Path(__file__).resolve().parents[1]
 if path==repo or repo in path.parents:raise Blocked('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY')
 if first:
  fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600);os.close(fd)
 with tempfile.NamedTemporaryFile(mode='w',dir=path.parent,delete=False) as f:
  temp=Path(f.name)
  try:
   json.dump(record,f,sort_keys=True,indent=2);f.write('\n');f.flush();os.fsync(f.fileno());os.replace(temp,path)
   fd=os.open(path.parent,os.O_RDONLY)
   try:os.fsync(fd)
   finally:os.close(fd)
  finally:
   if temp.exists():temp.unlink()

def empty_case(case):
 return {'case':case,'ran':False,'owner_reported_ok':None,'fatal_exception_observed':None,'crash_coverage_complete':False,'crash_window_started':False,'crash_window_ended':False,'boot_same':None,'apk_same':None,'elapsed_ns':0,'error_code':None}

def case_observation(case,question,answer=ask,expected_apk=None):
 row=empty_case(case)
 try:
  if answer('Start case '+case+' now? Choose y to start; n/s to skip.') is not True:return row
 except (KeyboardInterrupt,EOFError):row['error_code']='OWNER_RUN_INTERRUPTED';return row
 window=d.CrashWindow();before={};first_boot=None
 try:
  before=passive();first_boot=boot();window.start()
  if not window.started.is_set():raise Blocked('START_MARKER_UNAVAILABLE')
  if not first_boot or not before.get('apk_sha256') or (expected_apk is not None and before['apk_sha256']!=expected_apk):raise Blocked('CASE_IDENTITY_UNAVAILABLE')
  row['ran']=True;start=time.monotonic_ns()
  try:row['owner_reported_ok']=answer(question)
  finally:row['elapsed_ns']=max(0,time.monotonic_ns()-start)
 except Blocked as e:row['error_code']=str(e)
 except (KeyboardInterrupt,EOFError):row['error_code']='OWNER_RUN_INTERRUPTED'
 except Exception:row['error_code']='CASE_OBSERVATION_UNAVAILABLE'
 finally:
  row['fatal_exception_observed']=window.stop();row['crash_coverage_complete']=window.coverage_complete();row['crash_window_started']=window.started.is_set();row['crash_window_ended']=window.ended.is_set()
  after=passive();last_boot=boot();row['boot_same']=bool(first_boot and first_boot==last_boot) if last_boot else None
  row['apk_same']=bool(before.get('apk_sha256')==after.get('apk_sha256')) if before.get('apk_sha256') and after.get('apk_sha256') else None
 return row

def run(apk,output,sdk=None,install=False,answer=ask):
 if not os.isatty(0):raise Blocked('OWNER_TERMINAL_REQUIRED')
 report={'schema':1,'run':str(uuid.uuid4()),'session_complete':False,'error_code':None,'preflight':None,'smoke':None,'cases':[empty_case(key) for key in CASES]}
 save(output,report,first=True)
 try:
  if not pin_device():raise Blocked('DEVICE_NOT_IDENTIFIED')
  report['preflight']=check_update(apk,sdk);save(output,report)
  if report['preflight']['allowed'] is not True:raise Blocked(report['preflight']['error_code'] or 'SIGNING_UNVERIFIED')
  if install and answer('Install the signature-checked APK in place? No data reset or permission grant will run.') is not True:raise Blocked('INSTALL_NOT_AUTHORIZED')
  expected=hashlib.sha256(Path(apk).read_bytes()).hexdigest()
  report['smoke']={k:v for k,v in d.collect(apk if install else None,sdk).items() if k in SMOKE_KEYS};save(output,report)
  smoke=report['smoke']
  if smoke.get('apk_sha256')!=expected:raise Blocked('REQUESTED_APK_NOT_OBSERVED')
  if smoke.get('launch_stays_open') is not True or smoke.get('reopen_ok') is not True:raise Blocked('LAUNCH_OR_REOPEN_UNVERIFIED')
  if smoke.get('fatal_exception_observed') is True:raise Blocked('APP_FATAL_OBSERVED')
  if smoke.get('fatal_exception_observed') is not False or smoke.get('crash_coverage_complete') is not True:raise Blocked('CRASH_WINDOW_NOT_CLEAN')
  for index,(key,question) in enumerate(CASES.items()):
   report['cases'][index]=case_observation(key,question,answer,expected);save(output,report)
   row=report['cases'][index]
   if row['error_code']:raise Blocked(row['error_code'])
   if row['fatal_exception_observed'] is True:raise Blocked('APP_FATAL_OBSERVED')
   if row['ran'] and (row['fatal_exception_observed'] is not False or row['crash_coverage_complete'] is not True or row['boot_same'] is not True or row['apk_same'] is not True):raise Blocked('CASE_OBSERVATION_UNVERIFIED')
  report['session_complete']=True
 except Blocked as e:report['error_code']=str(e)
 except (KeyboardInterrupt,EOFError):report['error_code']='OWNER_RUN_INTERRUPTED'
 except Exception:report['error_code']='OWNER_RUN_UNAVAILABLE'
 finally:save(output,report)
 return report

def main():
 p=argparse.ArgumentParser();p.add_argument('--apk',type=Path,required=True);p.add_argument('--sdk',type=Path);p.add_argument('--output',type=Path);p.add_argument('--install',action='store_true');p.add_argument('--preflight',action='store_true');a=p.parse_args()
 if not a.apk.is_file():raise Blocked('APK_UNAVAILABLE')
 if a.preflight:
  if not pin_device():raise Blocked('DEVICE_NOT_IDENTIFIED')
  result=check_update(a.apk,a.sdk);print(json.dumps(result,sort_keys=True));return 0 if result['allowed'] is True else 2
 if not os.isatty(0):raise Blocked('OWNER_TERMINAL_REQUIRED')
 if a.output is None:raise Blocked('OUTPUT_REQUIRED')
 report=run(a.apk,a.output,a.sdk,a.install)
 print(json.dumps({'session_complete':report['session_complete'],'error_code':report['error_code'],'cases_run':sum(x['ran'] for x in report['cases']),'cases_skipped':sum(not x['ran'] for x in report['cases']),'owner_reported_failures':sum(x['owner_reported_ok'] is False for x in report['cases'])},sort_keys=True))
 if any(x['owner_reported_ok'] is False for x in report['cases']):return 1
 return 0 if report['session_complete'] and all(x['ran'] and x['owner_reported_ok'] is True for x in report['cases']) else 2
if __name__=='__main__':
 try:raise SystemExit(main())
 except Blocked as e:print(json.dumps({'session_complete':False,'error_code':str(e)}));raise SystemExit(2)
 except (OSError,ValueError):print(json.dumps({'session_complete':False,'error_code':'OWNER_RUN_UNAVAILABLE'}));raise SystemExit(2)
