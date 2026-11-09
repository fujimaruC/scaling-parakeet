import json,tempfile,unittest,uuid,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.core import Store,Invalid
from academic_os.pipeline import Pipeline
class PipelineTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.store=Store(self.temp.name);self.source=str(uuid.uuid4());self.store.enroll(self.source);self.store.import_text(self.source,'05/11/26, 19.00 - A: Raw private message contact a@example.com')
  self.ids=[m['id'] for m in self.store.evidence()];self.calls=[]
  self.env={'AI_BASE_URL':'http://127.0.0.1:20128/v1','AI_PROVIDER_ID':'synthetic-provider','AI_MODEL':'synthetic-model','AI_API_KEY':'synthetic-test-only','ACADEMIC_OS_API_URL':'https://synthetic.invalid/api/v1','COLLECTOR_SOURCE_ID':self.source,'COLLECTOR_KEY_ID':'synthetic','COLLECTOR_HMAC_SECRET':'synthetic-test-only'}
 def tearDown(self):self.store.db.close();self.temp.cleanup()
 def extract(self,*args):
  root=Path(__file__).resolve().parents[3];v=json.loads((root/'examples/ai-extraction.synthetic.json').read_text());v['candidates'][0]['evidence_ids']=self.ids;return v
 def test_placeholders_and_revoked_consent_never_call_provider(self):
  p=Pipeline(self.store,{},extractor=lambda *a:self.fail('network called'))
  with self.assertRaises(Invalid):p.consent(self.source,True)
  with self.assertRaises(Invalid):p.run(self.source,self.ids)
  p=Pipeline(self.store,self.env,extractor=self.extract);p.consent(self.source,True);p.consent(self.source,False)
  with self.assertRaises(Invalid):p.run(self.source,self.ids)
 def test_reviewed_projection_retry_preserves_exact_idempotency_after_restart(self):
  def fail(*args):self.calls.append(args[0]);raise OSError('provider details must never enter saved error')
  p=Pipeline(self.store,self.env,extractor=self.extract,uploader=fail,status_checker=lambda *a:{'generation':1});p.consent(self.source,True)
  self.assertNotIn('a@example.com',json.dumps(p.preview(self.source,self.ids)))
  job=p.run(self.source,self.ids)
  self.assertEqual(job['state'],'awaiting_projection_review')
  with self.assertRaises(Invalid):p.send(job['id'])
  p.queue(job['id'],True)
  with self.assertRaises(Invalid):p.send(job['id'])
  self.assertEqual(p.get(job['id'])['state'],'sync_pending')
  self.assertEqual(p.get(job['id'])['error_code'],'SYNC_FAILED')
  p=Pipeline(self.store,self.env,extractor=self.extract,uploader=lambda value,*a:self.calls.append(value),status_checker=lambda *a:{'generation':1})
  self.assertEqual(p.send(job['id'])['state'],'synced');self.assertEqual(self.calls[0],self.calls[1]);self.assertNotIn('Raw private message',json.dumps(self.calls[1]))
  self.assertEqual(p.send(job['id'])['state'],'synced');self.assertEqual(len(self.calls),2)
 def test_provider_change_and_foreign_evidence_fail_closed(self):
  p=Pipeline(self.store,self.env,extractor=self.extract);p.consent(self.source,True);self.env['AI_MODEL']='different'
  with self.assertRaises(Invalid):p.run(self.source,self.ids)
  with self.assertRaises(Invalid):p.preview(self.source,[str(uuid.uuid4())])
 def test_purge_removes_queued_jobs(self):
  p=Pipeline(self.store,self.env,extractor=self.extract);p.consent(self.source,True);job=p.run(self.source,self.ids);p.queue(job['id'],True);self.store.purge(self.source)
  with self.assertRaises(Invalid):p.get(job['id'])
 def test_cloud_purge_erases_raw_jobs_and_never_uploads(self):
  ack=[]
  p=Pipeline(self.store,self.env,extractor=self.extract,uploader=lambda *a:self.fail('must not upload revoked source'),status_checker=lambda *a:{'generation':2,'purge_required':True},purge_acknowledger=lambda *a:ack.append(a[:2]));p.consent(self.source,True);job=p.run(self.source,self.ids);p.queue(job['id'],True)
  with self.assertRaises(Invalid):p.send(job['id'])
  self.assertEqual(self.store.evidence(),[]);self.assertEqual(p.jobs(),[]);self.assertEqual(ack,[(self.source,2)])
 def test_redaction_keeps_dates_while_stripping_contacts(self):
  from academic_os.ai import redact
  value=redact('Kumpulkan 2026-11-25 23:59 hubungi +62 812 1234 5678 atau a@example.com')
  self.assertIn('2026-11-25 23:59',value);self.assertNotIn('812 1234',value);self.assertNotIn('a@example.com',value)
