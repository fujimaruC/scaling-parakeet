import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'scripts'))
import device_evidence as d
class CrashCoverageRegressionTests(unittest.TestCase):
 def test_unattributed_native_fatal_is_unknown_not_clean(self):
  c=d.CrashWindow();c.feed('I/AOS-RUN( 1): '+c.token+' START')
  c.feed('F/libc( 71): Fatal signal 11 (SIGSEGV), code 1, tid 71')
  c.feed('I/AOS-RUN( 1): '+c.token+' END')
  self.assertIsNone(c.result())
 def test_marker_looking_message_cannot_open_a_window(self):
  c=d.CrashWindow();c.feed('E/AndroidRuntime( 1): quoted '+c.token+' START')
  c.feed('E/AndroidRuntime( 1): quoted '+c.token+' END')
  self.assertFalse(c.started.is_set());self.assertIsNone(c.result())
 def test_pid_reuse_cannot_attribute_another_process_crash_to_this_app(self):
  c=d.CrashWindow();c.feed('I/AOS-RUN( 1): '+c.token+' START')
  c.feed('E/AndroidRuntime( 71): Process: '+d.PKG+', PID: 71')
  c.feed('E/AndroidRuntime( 71): FATAL EXCEPTION: main')
  c.feed('E/AndroidRuntime( 71): Process: other.app, PID: 71')
  c.feed('I/AOS-RUN( 1): '+c.token+' END')
  self.assertIsNone(c.result())

import tempfile,json,hashlib,os,threading
from unittest.mock import patch
import apk_safety as a
import owner_device_run as o
class SigningSafetyTests(unittest.TestCase):
 def scenario(self,match=True,present=True,retained=False,package=True,listing_ok=True):
  with tempfile.TemporaryDirectory() as tmp:
   sdk=Path(tmp)/'sdk';tools=sdk/'build-tools/35.0.0';tools.mkdir(parents=True)
   for n in ('aapt','apksigner'):(tools/n).touch()
   apk=Path(tmp)/'candidate.apk';apk.write_bytes(b'synthetic apk')
   def tool(path,*args):
    if Path(path).name=='aapt':return 0,"package: name='"+(d.PKG if package else 'other.app')+"' versionCode='2' versionName='synthetic'\n"
    digest='a'*64 if Path(args[-1]).name=='candidate.apk' or match else 'b'*64
    return 0,'Signer #1 certificate SHA-256 digest: '+digest+'\n'
   def command(*args):
    if args[:4]==('shell','pm','list','packages'):return (0 if listing_ok else 1),'package:'+d.PKG+'\n' if present else ''
    if args[:3]==('shell','pm','path'):return (0 if present else 1),('package:/data/app/synthetic/base.apk\n' if present and not retained else '')
    if args[0]=='pull':Path(args[-1]).write_bytes(b'synthetic installed apk');return 0,''
    self.fail('Unexpected command')
   with patch.object(a,'tool',side_effect=tool),patch.object(d,'command',side_effect=command):return a.check_update(apk,sdk)
 def test_matching_signer_allows_in_place_update(self):
  r=self.scenario();self.assertIs(r['allowed'],True);self.assertIs(r['signature_match'],True)
 def test_mismatched_signer_is_blocked(self):
  r=self.scenario(match=False);self.assertIs(r['allowed'],False);self.assertEqual(r['error_code'],'SIGNATURE_MISMATCH')
 def test_first_install_needs_positive_absence_not_failed_query(self):
  self.assertIs(self.scenario(present=False)['allowed'],True)
  self.assertIsNone(self.scenario(present=False,listing_ok=False)['allowed'])
 def test_retained_package_data_is_not_treated_as_first_install(self):
  r=self.scenario(retained=True);self.assertIsNone(r['allowed']);self.assertIs(r['package_present'],True)
 def test_wrong_package_and_missing_tools_fail_closed(self):
  self.assertIs(self.scenario(package=False)['allowed'],False)
  self.assertIsNone(a.check_update('synthetic.apk','/nonexistent')['allowed'])
 def test_install_never_runs_when_signing_is_unknown_or_incompatible(self):
  for allowed in (False,None):
   with patch.object(a,'check_update',return_value={'allowed':allowed}),patch.object(d,'command',side_effect=lambda *args:self.fail('Install ran without confirmed signing')) as command:
    self.assertIs(d.install('synthetic.apk'),False if allowed is False else None);command.assert_not_called()
 def test_unverified_or_multiple_signers_are_not_guessed(self):
  for code,text in [(1,''),(0,'Signer #1 certificate SHA-256 digest: '+'a'*64+'\nSigner #2 certificate SHA-256 digest: '+'b'*64+'\n')]:
   with patch.object(a,'tool',return_value=(code,text)):self.assertIsNone(a.certificate('synthetic.apk','apksigner'))
class OwnerHarnessTests(unittest.TestCase):
 def test_headless_run_has_no_device_side_effect(self):
  with tempfile.TemporaryDirectory() as tmp:
   apk=Path(tmp)/'candidate.apk';apk.touch();out=Path(tmp)/'report.json'
   with patch.object(sys,'argv',['owner_device_run.py','--apk',str(apk),'--output',str(out),'--install']),patch.object(o.os,'isatty',return_value=False),patch.object(o,'pin_device') as pin:
    with self.assertRaisesRegex(o.Blocked,'OWNER_TERMINAL_REQUIRED'):o.main()
    pin.assert_not_called();self.assertFalse(out.exists())
 def test_skipped_case_never_runs_or_claims_success(self):
  with patch.object(d,'CrashWindow') as window:
   row=o.case_observation('screen_usability','synthetic question',answer=lambda _:None)
  window.assert_not_called();self.assertFalse(row['ran']);self.assertIsNone(row['owner_reported_ok']);self.assertIsNone(row['fatal_exception_observed'])
 def window(self,started=True):
  class W:
   def __init__(self):self.started=threading.Event();self.ended=threading.Event()
   def start(self):
    if started:self.started.set()
   def stop(self):
    if started:self.ended.set()
    return False if started else None
   def coverage_complete(self):return started
  return W
 def test_missing_marker_does_not_prompt_for_or_certify_a_case(self):
  answer=unittest.mock.Mock(return_value=True)
  with patch.object(d,'CrashWindow',self.window(False)),patch.object(o,'passive',return_value={'apk_sha256':'a'*64}),patch.object(o,'boot',return_value='synthetic-boot'):
   row=o.case_observation('screen_usability','synthetic',answer)
  self.assertEqual(answer.call_count,1);self.assertFalse(row['ran']);self.assertEqual(row['error_code'],'START_MARKER_UNAVAILABLE');self.assertIsNone(row['fatal_exception_observed']);self.assertFalse(row['crash_window_started']);self.assertFalse(row['crash_window_ended'])
 def test_interrupted_case_keeps_its_actual_interval_and_unknown_owner_result(self):
  answer=unittest.mock.Mock(side_effect=[True,KeyboardInterrupt])
  with patch.object(d,'CrashWindow',self.window()),patch.object(o,'passive',return_value={'apk_sha256':'a'*64}),patch.object(o,'boot',return_value='synthetic-boot'):
   row=o.case_observation('screen_usability','synthetic',answer)
  self.assertTrue(row['ran']);self.assertGreater(row['elapsed_ns'],0);self.assertIsNone(row['owner_reported_ok']);self.assertEqual(row['error_code'],'OWNER_RUN_INTERRUPTED')
 def test_sanitized_checkpoint_survives_unavailable_case_and_drops_unknown_fields(self):
  with tempfile.TemporaryDirectory() as tmp:
   apk=Path(tmp)/'candidate.apk';apk.write_bytes(b'synthetic');out=Path(tmp)/'report.json'
   smoke={'apk_sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'launch_stays_open':True,'reopen_ok':True,'fatal_exception_observed':False,'crash_coverage_complete':True,'raw_text':'MUST_NOT_BE_SAVED'}
   row=o.empty_case('screen_usability');row.update(ran=True,error_code='OWNER_RUN_INTERRUPTED')
   with patch.object(o.os,'isatty',return_value=True),patch.object(o,'pin_device',return_value=True),patch.object(o,'check_update',return_value={'allowed':True}),patch.object(d,'collect',return_value=smoke),patch.object(o,'case_observation',return_value=row):r=o.run(apk,out,answer=lambda _:None)
   self.assertFalse(r['session_complete']);self.assertEqual(r['error_code'],'OWNER_RUN_INTERRUPTED');self.assertTrue(r['cases'][0]['ran']);self.assertNotIn('MUST_NOT_BE_SAVED',out.read_text());self.assertEqual(out.stat().st_mode&0o777,0o600)
 def test_wrong_installed_apk_blocks_all_manual_cases(self):
  with tempfile.TemporaryDirectory() as tmp:
   apk=Path(tmp)/'candidate.apk';apk.write_bytes(b'synthetic');out=Path(tmp)/'report.json'
   with patch.object(o.os,'isatty',return_value=True),patch.object(o,'pin_device',return_value=True),patch.object(o,'check_update',return_value={'allowed':True}),patch.object(d,'collect',return_value={'apk_sha256':'b'*64}),patch.object(o,'case_observation') as case:
    r=o.run(apk,out)
   case.assert_not_called();self.assertEqual(r['error_code'],'REQUESTED_APK_NOT_OBSERVED')
 def test_existing_evidence_is_not_overwritten(self):
  with tempfile.TemporaryDirectory() as tmp:
   out=Path(tmp)/'report.json';out.write_text('preserve')
   with self.assertRaises(FileExistsError):o.save(out,{},first=True)
   self.assertEqual(out.read_text(),'preserve')
class LegacyEntrySafetyTests(unittest.TestCase):
 def test_capture_matrix_is_interactive_before_creating_a_journal(self):
  import capture_matrix as m
  with patch.object(sys,'argv',['capture_matrix.py','--output','/tmp/synthetic-no-write']),patch.object(m.os,'isatty',return_value=False),patch.object(m,'Journal') as journal:
   with self.assertRaisesRegex(SystemExit,'OWNER_TERMINAL_REQUIRED'):m.main()
   journal.assert_not_called()
 def test_unconfirmed_install_readback_cannot_launch_the_old_app(self):
  class W:
   def start(self):pass
   def stop(self):return None
   def coverage_complete(self):return False
  with tempfile.TemporaryDirectory() as tmp:
   apk=Path(tmp)/'candidate.apk';apk.write_bytes(b'synthetic')
   def command(*args):
    if args[0]=='get-serialno':return 0,'synthetic-device'
    if args[:2]==('shell','cat'):return 0,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    self.fail('Launch or other unexpected command after unconfirmed artifact')
   with patch.object(d,'command',side_effect=command),patch.object(d,'CrashWindow',W),patch.object(d,'install',return_value=True),patch.object(d,'installed_artifact',return_value=(None,None)):
    r=d.collect(apk)
   self.assertIsNone(r['launch_stays_open']);self.assertIsNone(r['install_ok']);self.assertEqual(r['error_code'],'INSTALL_READBACK_UNVERIFIED');self.assertIs(r['crash_coverage_complete'],False)

class DirectOwnerGateTests(unittest.TestCase):
 def test_direct_run_also_requires_owner_terminal_before_any_output(self):
  with tempfile.TemporaryDirectory() as tmp:
   output=Path(tmp)/'report.json'
   with patch.object(o.os,'isatty',return_value=False),patch.object(o,'pin_device') as pin:
    with self.assertRaisesRegex(o.Blocked,'OWNER_TERMINAL_REQUIRED'):o.run(Path(tmp)/'apk',output)
    pin.assert_not_called();self.assertFalse(output.exists())

class CaseArtifactBindingTests(unittest.TestCase):
 def test_each_case_requires_the_requested_apk_not_just_two_matching_reads(self):
  helper=OwnerHarnessTests()
  answer=unittest.mock.Mock(return_value=True)
  with patch.object(d,'CrashWindow',helper.window()),patch.object(o,'passive',return_value={'apk_sha256':'b'*64}),patch.object(o,'boot',return_value='synthetic-boot'):
   row=o.case_observation('screen_usability','synthetic',answer,expected_apk='a'*64)
  self.assertFalse(row['ran']);self.assertEqual(row['error_code'],'CASE_IDENTITY_UNAVAILABLE');self.assertEqual(answer.call_count,1)
class FailedUpdateEntryTests(unittest.TestCase):
 def test_smoke_sampling_stops_after_unconfirmed_install(self):
  with tempfile.TemporaryDirectory() as tmp:
   apk=Path(tmp)/'candidate.apk';apk.touch()
   with patch.object(sys,'argv',['device_evidence.py','--apk',str(apk),'--samples','2']),patch.object(d,'collect',return_value={'install_ok':False,'error_code':'INSTALL_NOT_CONFIRMED'}) as collect,patch('builtins.print'):
    with self.assertRaises(SystemExit):d.main()
   self.assertEqual(collect.call_count,1)
 def test_matrix_cannot_test_an_old_app_after_an_unconfirmed_update(self):
  import capture_matrix as m
  with patch.object(sys,'argv',['capture_matrix.py','--output','/tmp/synthetic','--apk','synthetic.apk']),patch.object(m.os,'isatty',return_value=True),patch.object(m,'Journal'),patch.object(m,'collect',return_value={'install_ok':False,'error_code':'INSTALL_NOT_CONFIRMED'}),patch('builtins.print'),patch('builtins.input',side_effect=lambda *args:self.fail('Case started after failed update')) as ask:
   with self.assertRaises(ValueError):m.main()
   ask.assert_not_called()
class BriefFormatCompatibilityTests(unittest.TestCase):
 def test_padded_brief_markers_are_real_markers(self):
  c=d.CrashWindow();c.feed('I/AOS-RUN ( 1): '+c.token+' START');c.feed('I/AOS-RUN ( 1): '+c.token+' END')
  self.assertTrue(c.started.is_set());self.assertTrue(c.ended.is_set());self.assertIs(c.result(),False)
 def test_padded_native_fatal_is_not_reported_clean(self):
  for tag,body,expected in [('libc','Fatal signal 11',None),('DEBUG','>>> '+d.PKG+' <<<',True)]:
   c=d.CrashWindow();c.feed('I/AOS-RUN( 1): '+c.token+' START');c.feed('F/'+tag+'   ( 71): '+body);c.feed('I/AOS-RUN( 1): '+c.token+' END');self.assertIs(c.result(),expected)
 def test_padded_chatty_suppression_is_incomplete_coverage(self):
  c=d.CrashWindow();c.feed('I/AOS-RUN( 1): '+c.token+' START');c.feed('I/chatty  ( 71): identical lines suppressed');c.feed('I/AOS-RUN( 1): '+c.token+' END');self.assertIsNone(c.result())
