import tempfile,unittest,uuid,sys,json,importlib.util
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.core import Store,Invalid
from academic_os.pairing import Pairing
from academic_os.control import reconcile

class ControlTests(unittest.TestCase):
 def test_offline_retry_generations_and_phase_journal(self):
  with tempfile.TemporaryDirectory() as directory:
   store=Store(directory);source=str(uuid.uuid4());device=str(uuid.uuid4());store.enroll(source);store.register_device(device,source,1,'synthetic-key');pair=Pairing(store)
   store.purge(source)
   pair.acknowledge_purge(device,2,'delivered')
   self.assertEqual(store.db.execute('SELECT count(*) FROM device_purge_ack').fetchone()[0],0)
   with self.assertRaises(Invalid):pair.acknowledge_purge(device,1,'applied')
   pair.acknowledge_purge(device,2,'applied');store.db.close();store=Store(directory)
   env={'ACADEMIC_OS_API_URL':'https://synthetic.invalid/api/v1','COLLECTOR_KEY_ID':'synthetic','COLLECTOR_HMAC_SECRET':'synthetic','COLLECTOR_SOURCE_ID':source}
   with patch('academic_os.control.source_status',return_value={'purge_required':True,'generation':2}),patch('academic_os.control.collector_request',side_effect=OSError):
    with self.assertRaises(OSError):reconcile(store,env)
   self.assertEqual(store.db.execute('SELECT count(*) FROM device_action_observations').fetchone()[0],2)
   with patch('academic_os.control.source_status',return_value={'purge_required':True,'generation':2}),patch('academic_os.control.collector_request') as relay,patch('academic_os.control.purge_ack',return_value={'acknowledged':True}):
    reconcile(store,env);reconcile(store,env)
    self.assertEqual(store.db.execute('SELECT generation FROM sources').fetchone()[0],2)
    sent=relay.call_args.args[-1];self.assertEqual({o['phase'] for o in sent['observations']},{'delivered','applied'})
    self.assertEqual(set(sent),{'source_id','devices','observations','receipts'})
   store.db.close()
 def test_evidence_projection_never_passes_unrun_cases_or_private_extras(self):
  spec=importlib.util.spec_from_file_location('device_evidence',Path(__file__).resolve().parents[3]/'scripts/device_evidence.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with patch.object(module,'adb',return_value='private notification text'),patch.object(module.time,'sleep'):
   result=module.collect()
  self.assertEqual(result['smoke_result'],'unverified');self.assertEqual(result['capture'],'not_run');self.assertFalse(result['launch_stays_open']);self.assertNotIn('private',json.dumps(result))
 def test_receipt_ack_requires_real_commit_and_survives_restart(self):
  with tempfile.TemporaryDirectory() as directory:
   store=Store(directory);source=str(uuid.uuid4());device=str(uuid.uuid4());store.enroll(source);store.register_device(device,source,1,'synthetic');p=Pairing(store);batch=str(uuid.uuid4())
   with self.assertRaises(Invalid):p.acknowledge_receipt(device,batch,'applied')
   store.receive(device,{'protocol':1,'device_id':device,'batch_id':batch,'source_id':source,'source_generation':1,'events':[]})
   p.acknowledge_receipt(device,batch,'delivered')
   self.assertEqual(store.db.execute("SELECT count(*) FROM receipt_ack WHERE phase='applied'").fetchone()[0],0)
   p.acknowledge_receipt(device,batch,'applied');store.db.close();store=Store(directory)
   self.assertEqual(store.db.execute('SELECT count(*) FROM receipt_ack').fetchone()[0],2);store.db.close()
 def test_no_job_poll_wipes_locally_even_if_relay_response_is_lost(self):
  with tempfile.TemporaryDirectory() as directory:
   store=Store(directory);source=str(uuid.uuid4());store.enroll(source);store.import_text(source,'05/11/26, 12.00 - Fiction: synthetic sentinel')
   env={'ACADEMIC_OS_API_URL':'https://synthetic.invalid/api/v1','COLLECTOR_KEY_ID':'synthetic','COLLECTOR_HMAC_SECRET':'synthetic','COLLECTOR_SOURCE_ID':source}
   with patch('academic_os.control.source_status',return_value={'purge_required':True,'generation':2}),patch('academic_os.control.collector_request',side_effect=OSError):
    with self.assertRaises(OSError):reconcile(store,env)
   self.assertEqual(store.evidence(),[]);self.assertEqual(store.db.execute('SELECT generation FROM sources').fetchone()[0],2);store.db.close()
