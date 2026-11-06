import json,tempfile,unittest,uuid,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.core import Store,Invalid,parse_export
class CollectorTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.store=Store(self.temp.name);self.source=str(uuid.uuid4());self.store.enroll(self.source)
 def tearDown(self):self.store.db.close();self.temp.cleanup()
 def test_multiline_repeat_and_encryption(self):
  text='05/11/26, 19.00 - Ketua: Rapat besok\n1) agenda\n05/11/26, 19.01 - Ani: Tugas'
  self.assertEqual(self.store.import_text(self.source,text)['inserted'],2)
  self.assertEqual(self.store.import_text(self.source,text)['inserted'],0)
  self.assertIn('1) agenda',self.store.evidence()[0]['payload']['text'])
  payload=self.store.db.execute('SELECT payload FROM evidence').fetchone()[0];self.assertNotIn(b'Rapat',payload)
 def test_reject_unselected_before_parse(self):
  with self.assertRaises(Invalid):self.store.import_text(str(uuid.uuid4()),'private text')
  self.assertEqual(self.store.evidence(),[])
 def test_receipt_retry_and_purge_prevents_resurrection(self):
  device=str(uuid.uuid4());self.store.register_device(device,self.source,1,'secret')
  batch={'protocol':1,'device_id':device,'batch_id':str(uuid.uuid4()),'source_id':self.source,'source_generation':1,'events':[{'event_id':str(uuid.uuid4()),'captured_at':'2026-11-05T12:00:00+00:00','source_message_at':None,'text':'Rapat himpunan'}]}
  ack=self.store.receive(device,batch);self.assertEqual(ack['state'],'committed');self.assertEqual(self.store.receive(device,batch),ack);self.assertEqual(len(self.store.evidence()),1)
  changed=json.loads(json.dumps(batch));changed['events'][0]['text']='changed'
  with self.assertRaises(Invalid):self.store.receive(device,changed)
  changed['batch_id']=str(uuid.uuid4())
  with self.assertRaisesRegex(Invalid,'EVENT_REVISION_CONFLICT'):self.store.receive(device,changed)
  self.assertEqual(len(self.store.evidence()),1)
  self.store.purge(self.source)
  with self.assertRaises(Invalid):self.store.receive(device,batch)
  self.assertEqual(self.store.evidence(),[])
 def test_invalid_batch_rolls_back_all_events(self):
  device=str(uuid.uuid4());self.store.register_device(device,self.source,1,'secret')
  batch={'protocol':1,'device_id':device,'batch_id':str(uuid.uuid4()),'source_id':self.source,'source_generation':1,'events':[{'event_id':str(uuid.uuid4()),'captured_at':'2026-11-05T12:00:00Z','source_message_at':None,'text':'one'},{'unexpected':'raw'}]}
  with self.assertRaises(Invalid):self.store.receive(device,batch)
  self.assertEqual(self.store.evidence(),[])
 def test_external_ai_needs_explicit_consent(self):
  from academic_os.ai import extract
  with self.assertRaises(Invalid):extract([],{},'http://localhost:20128/v1','model','key',None)

class BackupTests(unittest.TestCase):
 def test_encrypted_disposable_restore_parity_and_no_dispatch(self):
  import sqlite3
  from academic_os.backup import ALLOWED,encrypt,restore
  migration=Path(__file__).resolve().parents[3]/'apps/worker/migrations'
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row;[db.executescript(item.read_text()) for item in sorted(migration.glob('*.sql'))]
   db.execute("INSERT INTO contexts(id,type,display_name) VALUES('org','organization','Synthetic Himpunan')")
   tables={t:[dict(r) for r in db.execute('SELECT * FROM '+t)] for t in ALLOWED};db.close()
   export=root/'canonical.json';export.write_text(json.dumps({'schema_version':'2.0','tables':tables}))
   encrypt(export,root/'backup.enc',root/'backup.key')
   self.assertNotIn(b'Synthetic Himpunan',(root/'backup.enc').read_bytes())
   counts=restore(root/'backup.enc',root/'backup.key',root/'restored.db',migration)
   self.assertEqual(counts['contexts'],1)
   with sqlite3.connect(root/'restored.db') as restored:self.assertEqual(restored.execute('SELECT count(*) FROM reminder_intents').fetchone()[0],0)

class ContractTests(unittest.TestCase):
 def test_shared_fixture_and_raw_rejection(self):
  from academic_os.contracts import validator,validate_extraction
  root=Path(__file__).resolve().parents[3]
  output=json.loads((root/'examples/ai-extraction.synthetic.json').read_text())
  validate_extraction(output,output['candidates'][0]['evidence_ids'])
  fixture=json.loads((root/'examples/sync-envelope.synthetic.json').read_text())
  validator('sync-envelope.schema.json').validate(fixture)
  fixture['raw_text']='private'
  from jsonschema.exceptions import ValidationError
  with self.assertRaises(ValidationError):validator('sync-envelope.schema.json').validate(fixture)
 def test_projection_never_copies_message_payload(self):
  from academic_os.sync import project
  root=Path(__file__).resolve().parents[3]
  with tempfile.TemporaryDirectory() as temp:
   store=Store(temp);source=str(uuid.uuid4());store.enroll(source);store.import_text(source,'05/11/26, 19.00 - A: RAW_PRIVATE_SENTINEL')
   evidence=store.evidence()[0];output=json.loads((root/'examples/ai-extraction.synthetic.json').read_text());output['candidates'][0]['evidence_ids']=[evidence['id']]
   envelope=project(store,source,output)
   self.assertNotIn('RAW_PRIVATE_SENTINEL',json.dumps(envelope))
   self.assertEqual(project(store,source,output)['candidates'][0]['candidate_id'],envelope['candidates'][0]['candidate_id'])
   store.db.close()

class CalendarTests(unittest.TestCase):
 def test_ics_precision_folding_and_recurrence_uncertainty(self):
  from academic_os.ical import parse_ics
  items=parse_ics('BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:synthetic\nSUMMARY:Organization\n  meeting\nDTSTART;VALUE=DATE:20261108\nRRULE:FREQ=WEEKLY\nEND:VEVENT\nEND:VCALENDAR')
  self.assertEqual(items[0]['title'],'Organization meeting')
  self.assertEqual(items[0]['due']['precision'],'date_only')
  self.assertIsNone(items[0]['due']['local_datetime'])
  self.assertIn('recurrence_requires_review',items[0]['issues'])
