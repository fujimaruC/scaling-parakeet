"""Synthetic adapters and local HTTP only. Recovery package: NOT RUN by builder."""
import json,secrets,sys,tempfile,threading,unittest,urllib.error,urllib.parse,urllib.request,uuid
from pathlib import Path
from http.server import HTTPServer
from unittest.mock import Mock,patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.core import Store,Invalid
from academic_os.pipeline import Pipeline
from academic_os.jobs import tick
from academic_os.pairing import Pairing
from academic_os.operations import job_action,page
from academic_os.server import make_handler
class LegacyJobsTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.store=Store(self.temp.name);self.a=str(uuid.uuid4());self.b=str(uuid.uuid4());self.ids={}
  for source in (self.a,self.b):
   self.store.enroll(source);self.store.import_text(source,'05/11/26, 19.00 - Synthetic: Synthetic duty')
   self.ids[source]=[e['id'] for e in self.store.evidence() if e['source_id']==source]
  self.env={'AI_BASE_URL':'http://127.0.0.1:20128/v1','AI_PROVIDER_ID':'synthetic','AI_MODEL':'synthetic','AI_API_KEY':'synthetic','ACADEMIC_OS_API_URL':'https://synthetic.invalid/api/v1','COLLECTOR_SOURCE_ID':self.a,'COLLECTOR_KEY_ID':'synthetic','COLLECTOR_HMAC_SECRET':'synthetic'}
  self.upload=Mock();self.p=self.pipeline();Pairing(self.store)
  for source in (self.a,self.b):self.p.consent(source,True)
 def pipeline(self):
  def extract(messages,*_args):
   value=json.loads((Path(__file__).resolve().parents[3]/'examples/ai-extraction.synthetic.json').read_text());value['candidates'][0]['evidence_ids']=[m['id'] for m in messages];return value
  return Pipeline(self.store,self.env,extractor=extract,uploader=self.upload,status_checker=lambda *_:{'generation':1})
 def tearDown(self):self.store.db.close();self.temp.cleanup()
 def legacy(self,source=None,queue=True):
  source=source or self.a;j=self.p.run(source,self.ids[source])
  if queue:self.p.queue(j['id'],True)
  with self.store.db:self.store.db.execute('DELETE FROM processing_retry WHERE job_id=?',(j['id'],))
  return j['id']
 def form(self,job,source=None,generation=1):return {'action':'legacy-send','job_id':job,'source_id':source or self.a,'generation':str(generation),'confirmed':'yes'}
 def test_visible_legacy_row_can_send_once_without_becoming_automatic(self):
  ident=self.legacy();html=page(self.p);self.assertIn('legacy_manual_only',html);self.assertIn('predates retry metadata',html);self.assertIn('Send legacy job once',html)
  self.assertEqual(job_action(self.p,self.form(ident))['state'],'synced');self.assertEqual(self.upload.call_count,1)
  self.assertEqual(self.store.db.execute('SELECT count(*) FROM processing_retry WHERE job_id=?',(ident,)).fetchone()[0],0)
  with self.assertRaisesRegex(Invalid,'LEGACY_MANUAL_ALREADY_ATTEMPTED'):job_action(self.p,self.form(ident))
  self.assertEqual(tick(self.p,self.a)['state'],'idle');self.assertEqual(self.upload.call_count,1)
  self.assertIn('One-time send already attempted',page(self.p));self.assertNotIn('>Send legacy job once<',page(self.p))
 def test_source_generation_confirmation_and_review_are_checked_before_any_send(self):
  ident=self.legacy();other=self.legacy(self.b)
  for value,code in [(self.form(ident,self.b),'JOB_SOURCE_MISMATCH'),(self.form(other,self.a),'JOB_SOURCE_MISMATCH'),(self.form(ident,generation=2),'SOURCE_GENERATION_CHANGED'),({**self.form(ident),'confirmed':'no'},'MANUAL_SEND_CONFIRMATION_REQUIRED'),(self.form(other,self.b),'SOURCE_CREDENTIAL_REQUIRED')]:
   with self.assertRaisesRegex(Invalid,code):job_action(self.p,value)
  pending=self.legacy(queue=False)
  with self.assertRaisesRegex(Invalid,'PROJECTION_REVIEW_REQUIRED'):job_action(self.p,self.form(pending))
  self.upload.assert_not_called();self.assertFalse(self.p.get(ident)['retry']['manual_attempted'])
 def test_uncertain_or_refused_legacy_send_is_never_replayed_after_restart(self):
  for error in [TimeoutError('synthetic unknown'),urllib.error.HTTPError('https://synthetic.invalid',429,'synthetic refusal',{},None)]:
   ident=self.legacy();self.upload.side_effect=error
   with self.assertRaisesRegex(Invalid,'SYNC_FAILED'):job_action(self.p,self.form(ident))
   before=self.upload.call_count;self.store.db.close();self.store=Store(self.temp.name);self.p=self.pipeline()
   self.assertEqual(tick(self.p,self.a)['state'],'idle');self.assertEqual(self.upload.call_count,before)
   with self.assertRaisesRegex(Invalid,'LEGACY_MANUAL_ALREADY_ATTEMPTED'):job_action(self.p,self.form(ident))
   self.assertEqual(self.store.db.execute('SELECT count(*) FROM processing_retry WHERE job_id=?',(ident,)).fetchone()[0],0)
 def test_authenticated_row_form_preserves_origin_and_source_boundaries(self):
  ident=self.legacy();other=self.legacy(self.b);token=secrets.token_urlsafe(32)
  server=HTTPServer(('127.0.0.1',0),lambda *_:None);origin='http://127.0.0.1:'+str(server.server_port)
  with patch('academic_os.server.Pipeline',return_value=self.p):server.RequestHandlerClass=make_handler(self.store,token,origin)
  t=threading.Thread(target=server.serve_forever,daemon=True);t.start()
  def post(path,data,cookie=None,request_origin=origin,content='application/x-www-form-urlencoded'):
   headers={'Origin':request_origin,'Content-Type':content}
   if cookie:headers['Cookie']=cookie
   return urllib.request.urlopen(urllib.request.Request(origin+path,data=data,headers=headers),timeout=5)
  try:
   with self.assertRaises(urllib.error.HTTPError) as denied:post('/operations/job-action',urllib.parse.urlencode(self.form(ident)).encode())
   self.assertEqual(denied.exception.code,401)
   with post('/login',json.dumps({'token':token}).encode(),content='application/json') as response:cookie=response.headers['Set-Cookie'].split(';')[0]
   with self.assertRaises(urllib.error.HTTPError):post('/operations/job-action',urllib.parse.urlencode(self.form(ident)).encode(),cookie,'https://evil.invalid')
   with self.assertRaises(urllib.error.HTTPError) as mismatch:post('/operations/job-action',urllib.parse.urlencode(self.form(other)).encode(),cookie)
   self.assertIn(b'JOB_SOURCE_MISMATCH',mismatch.exception.read());self.upload.assert_not_called()
   with post('/operations/job-action',urllib.parse.urlencode(self.form(ident)).encode(),cookie) as response:self.assertIn(b'One-time send already attempted',response.read())
   with self.assertRaises(urllib.error.HTTPError) as duplicate:post('/operations/job-action',urllib.parse.urlencode(self.form(ident)).encode(),cookie)
   self.assertIn(b'LEGACY_MANUAL_ALREADY_ATTEMPTED',duplicate.exception.read());self.assertEqual(self.upload.call_count,1)
  finally:server.shutdown();server.server_close();t.join()
