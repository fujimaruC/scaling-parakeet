"""Synthetic adapter failures. No real provider/cloud/device requests."""
import json
import io
import sys
import tempfile
import unittest
import urllib.error
import uuid
from pathlib import Path
from unittest.mock import Mock,patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.core import Store,Invalid
from academic_os.pipeline import Pipeline
from academic_os.jobs import tick,job_lock,MAX_ATTEMPTS

class RetryTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.store=Store(self.temp.name);self.source=str(uuid.uuid4());self.store.enroll(self.source)
  self.store.import_text(self.source,'05/11/26, 19.00 - Synthetic: Synthetic duty')
  self.ids=[e['id'] for e in self.store.evidence()];self.now=1000
  self.env={'AI_BASE_URL':'http://127.0.0.1:20128/v1','AI_PROVIDER_ID':'synthetic','AI_MODEL':'synthetic','AI_API_KEY':'synthetic','ACADEMIC_OS_API_URL':'https://synthetic.invalid/api/v1','COLLECTOR_KEY_ID':'synthetic','COLLECTOR_HMAC_SECRET':'synthetic','COLLECTOR_SOURCE_ID':self.source}
  self.output=json.loads((Path(__file__).resolve().parents[3]/'examples/ai-extraction.synthetic.json').read_text());self.output['candidates'][0]['evidence_ids']=self.ids
  self.extractor=Mock(return_value=self.output);self.upload=Mock();self.status=Mock(return_value={'generation':1})
  self.p=self.pipeline();self.p.consent(self.source,True)
 def pipeline(self):return Pipeline(self.store,self.env,extractor=self.extractor,uploader=self.upload,status_checker=self.status,clock=lambda:self.now)
 def tearDown(self):self.store.db.close();self.temp.cleanup()
 def refused(self):return urllib.error.HTTPError('https://synthetic.invalid',429,'synthetic refusal',{},None)
 def failed_extract(self,error):
  self.extractor.side_effect=error
  with self.assertRaisesRegex(Invalid,'EXTRACTION_FAILED'):self.p.run(self.source,self.ids)
  return self.p.jobs()[0]['id']
 def queued(self):
  j=self.p.run(self.source,self.ids);return self.p.queue(j['id'],True)['id']
 def test_transient_refusal_then_success_stops_at_projection_review(self):
  ident=self.failed_extract(self.refused());self.assertEqual(self.p.get(ident)['retry']['next_attempt_at'],1030)
  self.assertEqual(tick(self.p,self.source)['state'],'idle');self.assertEqual(self.extractor.call_count,1)
  self.now=1030;self.extractor.side_effect=None;tick(self.p,self.source)
  job=self.p.get(ident);self.assertEqual(job['state'],'awaiting_projection_review');self.assertEqual(job['retry']['state'],'complete')
  self.assertEqual(self.extractor.call_count,2);self.upload.assert_not_called()
  self.assertEqual(self.store.db.execute('SELECT count(*) FROM processing_attempts').fetchone()[0],2)
  self.assertTrue(all(c['needs_review'] for c in job['payload']['envelope']['candidates']))
 def test_permanent_failure_is_terminal_and_refusals_exhaust(self):
  ident=self.failed_extract(urllib.error.HTTPError('https://synthetic.invalid',400,'synthetic',{},None));self.now+=100000
  self.assertEqual(tick(self.p,self.source)['state'],'idle');self.assertEqual(self.extractor.call_count,1);self.assertEqual(self.p.get(ident)['retry']['state'],'failed')
  self.extractor.side_effect=None;ident=self.queued();self.upload.side_effect=self.refused()
  delays=[]
  for attempt in range(1,MAX_ATTEMPTS['sync']+1):
   tick(self.p,self.source);r=self.p.get(ident)['retry'];self.assertEqual(r['attempts'],attempt)
   if r['next_attempt_at'] is not None:delays.append(r['next_attempt_at']-self.now);self.now=r['next_attempt_at']
  self.assertEqual(delays,[30,60,120,240]);self.assertEqual(r['state'],'exhausted');self.now+=100000
  tick(self.p,self.source);self.assertEqual(self.upload.call_count,5)
 def test_restart_mid_backoff_keeps_due_time_and_attempt_count(self):
  ident=self.failed_extract(self.refused());self.store.db.close();self.store=Store(self.temp.name);self.p=self.pipeline()
  self.now=1029;tick(self.p,self.source);self.assertEqual(self.extractor.call_count,1)
  self.now=1030;self.extractor.side_effect=None;tick(self.p,self.source)
  self.assertEqual(self.p.get(ident)['retry']['attempts'],2);self.assertEqual(self.p.get(ident)['state'],'awaiting_projection_review')
 def test_ambiguous_extraction_or_upload_never_automatically_replays(self):
  ident=self.failed_extract(TimeoutError('private response detail'))
  self.assertEqual(self.p.get(ident)['retry']['state'],'unknown');self.now+=100000;tick(self.p,self.source);self.assertEqual(self.extractor.call_count,1)
  self.extractor.side_effect=None;ident=self.queued();self.upload.side_effect=TimeoutError('unknown after commit')
  tick(self.p,self.source);self.now+=100000;tick(self.p,self.source)
  self.assertEqual(self.upload.call_count,1);self.assertEqual(self.p.get(ident)['retry']['state'],'unknown')
  before=self.upload.call_args.args[0];self.upload.side_effect=None;self.p.send(ident)
  self.assertEqual(self.upload.call_args.args[0],before);self.assertEqual(self.p.get(ident)['state'],'synced')
  self.assertNotIn('private response detail',json.dumps(self.p.jobs()))
 def test_process_death_after_durable_claim_is_unknown_on_restart(self):
  ident=self.failed_extract(self.refused());self.now=1030;self.p.attempts.begin(ident,'extract')
  self.store.db.close();self.store=Store(self.temp.name);self.p=self.pipeline();self.now+=100000
  tick(self.p,self.source);self.assertEqual(self.extractor.call_count,1);self.assertEqual(self.p.get(ident)['retry']['state'],'unknown')
  self.assertEqual(self.store.db.execute('SELECT error_code FROM processing_attempts WHERE attempt=2').fetchone()[0],'INTERRUPTED_ATTEMPT')
 def test_revoked_or_changed_consent_and_generation_prevent_retry(self):
  for change in ('revoke','provider','generation'):
   with self.subTest(change=change):
    self.env['AI_PROVIDER_ID']='synthetic';self.p.consent(self.source,True)
    ident=self.failed_extract(self.refused());before=self.extractor.call_count
    if change=='revoke':self.p.consent(self.source,False)
    elif change=='provider':self.env['AI_PROVIDER_ID']='different'
    else:
     with self.store.db:self.store.db.execute('UPDATE sources SET generation=2 WHERE id=?',(self.source,))
    self.now+=1000;tick(self.p,self.source);self.assertEqual(self.extractor.call_count,before);self.assertEqual(self.p.get(ident)['retry']['state'],'failed')
 def test_status_read_failure_retries_but_foreign_credentials_cannot_upload(self):
  ident=self.queued();self.status.side_effect=TimeoutError();tick(self.p,self.source);self.upload.assert_not_called()
  self.assertIsNone(self.store.db.execute('SELECT last_sync_at FROM source_operations WHERE source_id=?',(self.source,)).fetchone()[0])
  self.status.side_effect=None;self.now+=30;tick(self.p,self.source);self.assertEqual(self.upload.call_count,1)
  self.assertIsNotNone(self.store.db.execute('SELECT last_sync_at FROM source_operations WHERE source_id=?',(self.source,)).fetchone()[0])
  ident=self.queued();self.env['COLLECTOR_SOURCE_ID']=str(uuid.uuid4())
  tick(self.p,self.source);self.assertEqual(self.upload.call_count,1)
 def test_sync_only_confirms_a_matching_durable_batch_receipt(self):
  from academic_os.sync import upload,source_status
  # A read-only status response has no batch receipt and must keep working.
  with patch('urllib.request.urlopen',return_value=io.BytesIO(json.dumps({'data':{'generation':1}}).encode())):
   self.assertEqual(source_status(self.source,self.env['ACADEMIC_OS_API_URL'],'synthetic','synthetic'),{'generation':1})
  self.p.uploader=upload
  for receipt in ({'data':{'batch_id':'wrong-batch'}},{'data':{}},{'login_required':True}):
   ident=self.queued()
   with patch('urllib.request.urlopen',return_value=io.BytesIO(json.dumps(receipt).encode())):
    with self.assertRaisesRegex(Invalid,'SYNC_FAILED'):self.p.send(ident)
   self.assertEqual(self.p.get(ident)['retry']['state'],'unknown');self.assertEqual(self.p.get(ident)['state'],'sync_pending')
  ident=self.queued();batch=self.p.get(ident)['payload']['envelope']['batch_id']
  with patch('urllib.request.urlopen',return_value=io.BytesIO(json.dumps({'data':{'batch_id':batch,'replayed':True}}).encode())):
   self.assertEqual(self.p.send(ident)['state'],'synced')
 def test_job_process_lock_blocks_second_sender(self):
  ident=self.queued()
  with job_lock(self.store):
   with self.assertRaisesRegex(Invalid,'JOB_RUNNER_BUSY'):self.p.send(ident)
  self.upload.assert_not_called()
 def test_purge_during_extraction_cannot_resurrect_job(self):
  def purge(*args):self.store.purge(self.source);return self.output
  self.extractor.side_effect=purge
  with self.assertRaisesRegex(Invalid,'EXTRACTION_FAILED'):self.p.run(self.source,self.ids)
  self.assertEqual(self.p.jobs(),[]);self.assertEqual(self.store.evidence(),[])
  self.assertEqual(self.store.db.execute('SELECT count(*) FROM processing_attempts').fetchone()[0],0)

if __name__=='__main__':unittest.main()
