import importlib.util,sys,tempfile,unittest,json,zipfile
from pathlib import Path
from unittest.mock import patch
SCRIPTS=Path(__file__).resolve().parents[3]/'scripts'
sys.path.insert(0,str(SCRIPTS))
import device_evidence as d
import capture_matrix as m
class DeviceEvidenceTests(unittest.TestCase):
 def test_install_success_is_not_issued_or_cached(self):
  for code,text,expected in [(0,'Success\n',True),(1,'Failure [TEST]',False),(None,'',None),(0,'issued',None)]:
   with patch.object(d,'command',return_value=(code,text)):self.assertIs(d.install('fixture.apk'),expected)
 def test_activity_history_cannot_satisfy_resumed(self):
  self.assertFalse(d.resumed('Hist #0: '+d.COMP))
  self.assertTrue(d.resumed('mResumedActivity: ActivityRecord{xyz u0 '+d.COMP+' t1}'))
  self.assertFalse(d.resumed('mResumedActivity: ActivityRecord{xyz u0 unrelated/.Activity t1}\nHist '+d.COMP))
 def test_crash_window_ignores_old_and_unrelated_but_retains_early_crash(self):
  c=d.CrashWindow();c.feed('E/AndroidRuntime( 2): FATAL EXCEPTION: main');c.feed('E/AndroidRuntime( 2): Process: '+d.PKG+', PID: 2')
  c.feed('I/AOS-RUN( 1): '+c.token+' START')
  c.feed('E/AndroidRuntime( 3): FATAL EXCEPTION: main');c.feed('E/AndroidRuntime( 3): Process: other.app, PID: 3')
  c.feed('I/AOS-RUN( 1): '+c.token+' END');self.assertIs(c.result(),False)
  c=d.CrashWindow();c.feed(c.token+' START');c.feed('E/AndroidRuntime( 4): FATAL EXCEPTION: main');c.feed('E/AndroidRuntime( 4): Process: '+d.PKG+', PID: 4')
  for i in range(1000):c.feed('unrelated')
  c.feed(c.token+' END');self.assertIs(c.result(),True)
 def test_incomplete_or_ambiguous_stream_is_unknown(self):
  c=d.CrashWindow();self.assertIsNone(c.result());c.feed(c.token+' START');self.assertIsNone(c.result());c.feed('logcat: dropped events');c.feed(c.token+' END');self.assertIsNone(c.result())
 def test_native_crash_and_incomplete_fatal_attribution(self):
  c=d.CrashWindow();c.feed(c.token+' START');c.feed('F/DEBUG( 5): pid: 1, tid: 1 >>> '+d.PKG+' <<<');c.feed(c.token+' END');self.assertIs(c.result(),True)
  c=d.CrashWindow();c.feed(c.token+' START');c.feed('E/AndroidRuntime( 4): FATAL EXCEPTION: main');c.feed(c.token+' END');self.assertIsNone(c.result())
 def test_readback_hash_and_embedded_clean_revision(self):
  with tempfile.TemporaryDirectory() as temp:
   def cmd(*args):
    with zipfile.ZipFile(args[-1],'w') as z:z.writestr('assets/academic-os-build.json',json.dumps({'source_commit':'a'*40,'source_dirty':False}))
    return 0,''
   with patch.object(d,'adb',return_value='package:/data/app/fixture/base.apk\n'),patch.object(d,'command',side_effect=cmd):
    digest,commit=d.installed_artifact();self.assertEqual(len(digest),64);self.assertEqual(commit,'a'*40)
   with patch.object(d,'adb',return_value='package:/data/app/a/base.apk\npackage:/data/app/a/split.apk'):self.assertEqual(d.installed_artifact(),(None,None))
 def test_dirty_or_missing_provenance_is_unknown(self):
  def cmd(*args):
   with zipfile.ZipFile(args[-1],'w') as z:z.writestr('assets/academic-os-build.json',json.dumps({'source_commit':'a'*40,'source_dirty':True}))
   return 0,''
  with patch.object(d,'adb',return_value='package:/data/app/a/base.apk'),patch.object(d,'command',side_effect=cmd):self.assertIsNone(d.installed_artifact()[1])
 def test_run_binds_cold_process_warm_resume_and_installed_identity(self):
  class Window:
   def start(self):pass
   def stop(self):return False
  for changed_process,changed_apk,changed_boot in [(False,False,False),(True,False,False),(False,True,False),(False,False,True)]:
   identifiers=iter(['sample','cold','warm']);phase=[0]
   def read(*args):
    if args[:2]==('shell','am') and args[2]=='start':phase[0]=0 if args[-1]=='cold' else 1
    if args[:2]==('shell','pidof'):return '777' if changed_process and phase[0] else '321'
    if args[:2]==('shell','dumpsys'):return 'mResumedActivity: ActivityRecord{xyz u0 '+d.COMP+' t1}'
    if args[0]=='logcat':return json.dumps({'run':'cold','notification_access':False,'queue_count':0})
    return ''
   def cmd(*args):
    if args[0]=='get-serialno':return 0,'synthetic-device'
    if args[1]=='cat':return 0,('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' if changed_boot and phase[0] else 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    return (0,'') if args[1]=='am' else (1,'')
   artifacts=[('a'*64,'c'*40),('b'*64 if changed_apk else 'a'*64,'c'*40)]
   with patch.object(d,'adb',side_effect=read),patch.object(d,'command',side_effect=cmd),patch.object(d,'installed_artifact',side_effect=artifacts),patch.object(d,'CrashWindow',Window),patch.object(d.time,'sleep'),patch.object(d.uuid,'uuid4',side_effect=lambda:next(identifiers)):
    record=d.collect()
   self.assertIs(record['launch_stays_open'],None if changed_boot else True)
   self.assertIs(record['reopen_ok'],None if changed_process or changed_boot else True)
   self.assertEqual(record['apk_sha256'],None if changed_apk else 'a'*64)
   self.assertEqual(record['source_commit'],None if changed_apk else 'c'*40)
 def test_case_cannot_pass_without_real_permission_transition_and_complete_window(self):
  before={'apk_sha256':'fixture','notification_access':False};after={'apk_sha256':'fixture','notification_access':True,'fatal_exception_observed':False}
  self.assertEqual(m.verdict('grant',before,after,1),'PASS')
  self.assertEqual(m.verdict('selected_unselected',before,after,1),'UNVERIFIED')
  self.assertEqual(m.verdict('grant',before,after,0),'UNVERIFIED')
  after['fatal_exception_observed']=None;self.assertEqual(m.verdict('grant',before,after,1),'UNVERIFIED')
 def test_sealed_cases_reject_edits_truncation_and_finishing_without_beginning(self):
  with tempfile.TemporaryDirectory() as temp:
   path=Path(temp)/'run';j=m.Journal(path);j.append({'kind':'begin','case':'grant','token':'x','observation':{'apk_sha256':'x','notification_access':False}})
   j.append({'kind':'end','case':'grant','token':'x','elapsed_ns':1,'observation':{'apk_sha256':'x','notification_access':True,'fatal_exception_observed':False}});j.finish()
   self.assertEqual(m.verify(path)[0]['result'],'PASS');original=(path/'record.jsonl').read_text()
   (path/'record.jsonl').write_text(original.replace('grant','revoke'))
   with self.assertRaises(ValueError):m.verify(path)
   (path/'record.jsonl').write_text('\n'.join(original.splitlines()[:-1])+'\n')
   with self.assertRaises(ValueError):m.verify(path)
   path=Path(temp)/'bad';j=m.Journal(path);j.append({'kind':'end','case':'grant','token':'x','elapsed_ns':1,'observation':{}});j.finish()
   with self.assertRaises(ValueError):m.verify(path)
