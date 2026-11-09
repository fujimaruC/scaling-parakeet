"""Multi-source local forms, stale generations and non-destructive pause."""
import json,secrets,sys,tempfile,threading,unittest,urllib.error,urllib.parse,urllib.request,uuid
from pathlib import Path
from http.server import HTTPServer
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.core import Store,Invalid
from academic_os.pipeline import Pipeline
from academic_os.pairing import Pairing
from academic_os.operations import action,sources,page
from academic_os.server import make_handler

class OperationsTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.store=Store(self.temp.name);self.a=str(uuid.uuid4());self.b=str(uuid.uuid4())
  for source in (self.a,self.b):self.store.enroll(source);self.store.import_text(source,'05/11/26, 19.00 - Synthetic: Synthetic source duty')
  self.env={'AI_BASE_URL':'http://127.0.0.1:20128/v1','AI_PROVIDER_ID':'synthetic','AI_MODEL':'synthetic','AI_API_KEY':'synthetic'}
  self.p=Pipeline(self.store,self.env);self.pair=Pairing(self.store)
 def tearDown(self):self.store.db.close();self.temp.cleanup()
 def value(self,source,command,generation=1):return {'source_id':source,'generation':str(generation),'action':command,**self.p.config(),'confirmed':'yes'}
 def test_two_sources_consent_revoke_and_evidence_are_independent(self):
  action(self.p,self.value(self.a,'consent'));rows={r['source_id']:r for r in sources(self.p)}
  self.assertEqual(rows[self.a]['consent_mode'],'external_selected');self.assertEqual(rows[self.b]['consent_mode'],'disabled')
  action(self.p,self.value(self.b,'consent'));before=[m for m in self.store.evidence() if m['source_id']==self.b]
  action(self.p,self.value(self.a,'revoke'));rows={r['source_id']:r for r in sources(self.p)}
  self.assertEqual(rows[self.a]['consent_mode'],'disabled');self.assertEqual(rows[self.b]['consent_mode'],'external_selected')
  self.assertEqual(before,[m for m in self.store.evidence() if m['source_id']==self.b]);self.assertEqual(len(self.store.evidence()),2)
 def test_stale_generation_is_visible_and_rejected_without_consent(self):
  action(self.p,self.value(self.a,'consent'))
  self.store.observe_source(self.a,{'generation':2})
  self.assertIn('Generation changed',page(self.p));self.assertTrue(sources(self.p)[0 if self.a<self.b else 1]['generation_warning'])
  with self.assertRaisesRegex(Invalid,'SOURCE_RECONCILIATION_REQUIRED'):action(self.p,self.value(self.a,'resume'))
  with self.store.db:self.store.db.execute('UPDATE sources SET generation=2 WHERE id=?',(self.a,))
  with self.assertRaisesRegex(Invalid,'SOURCE_GENERATION_CHANGED'):action(self.p,self.value(self.a,'revoke'))
  self.assertEqual(sources(self.p)[0 if self.b<self.a else 1]['consent_mode'],'disabled')
 def test_pause_cannot_masquerade_as_phone_revocation_or_erase_evidence(self):
  device=str(uuid.uuid4());self.store.register_device(device,self.a,1,'synthetic')
  action(self.p,self.value(self.a,'pause'));self.assertFalse(self.pair.status(device)['revoked'])
  self.assertEqual(len(self.store.evidence()),2)
  with self.assertRaises(Invalid):self.store.import_text(self.a,'05/11/26, 20.00 - Synthetic: Synthetic paused')
  self.store.import_text(self.b,'05/11/26, 20.00 - Synthetic: Synthetic active')
  action(self.p,self.value(self.a,'resume'));self.store.allowed(self.a,1)
  self.store.purge(self.a)
  with self.assertRaisesRegex(Invalid,'SOURCE_RECONCILIATION_REQUIRED'):action(self.p,self.value(self.a,'resume',2))
 def test_unknown_observations_do_not_become_empty_or_successful(self):
  rows=sources(self.p);self.assertTrue(all(r['last_sync_at'] is None and r['cloud_generation'] is None for r in rows));self.assertTrue(all(r['last_import_at'] for r in rows))
  self.store.mark_sync(self.a);self.store.observe_source(self.a,{'generation':1,'paused':True})
  rows={r['source_id']:r for r in sources(self.p)}
  self.assertTrue(rows[self.a]['last_sync_at']);self.assertTrue(rows[self.a]['cloud_paused']);self.assertIsNone(rows[self.b]['last_sync_at'])
  self.assertFalse(rows[self.a]['purged'])
 def test_explicit_identity_and_current_disclosure_are_required(self):
  with self.assertRaisesRegex(Invalid,'EXPLICIT_SOURCE_GENERATION_REQUIRED'):action(self.p,{'action':'consent'})
  v=self.value(self.a,'consent');v['provider']='stale-disclosure'
  with self.assertRaisesRegex(Invalid,'CONSENT_REQUIRED'):action(self.p,v)
  v=self.value(self.b,'consent');del v['confirmed']
  with self.assertRaisesRegex(Invalid,'CONSENT_REQUIRED'):action(self.p,v)
  self.assertTrue(all(r['consent_mode']=='disabled' for r in sources(self.p)))
 def test_purge_stays_pending_until_explicit_linux_and_known_phone_acks(self):
  from academic_os.control import reconcile
  device=str(uuid.uuid4());self.store.register_device(device,self.a,1,'synthetic')
  env={'COLLECTOR_SOURCE_ID':self.a,'COLLECTOR_KEY_ID':'synthetic','COLLECTOR_HMAC_SECRET':'synthetic','ACADEMIC_OS_API_URL':'https://synthetic.invalid/api/v1'}
  with patch('academic_os.control.source_status',return_value={'generation':2,'purge_required':True}),patch('academic_os.control.collector_request'),patch('academic_os.control.purge_ack',return_value={'acknowledged':False}):
   with self.assertRaisesRegex(ValueError,'PURGE_ACK_UNVERIFIED'):reconcile(self.store,env)
  row={r['source_id']:r for r in sources(self.p)}[self.a];self.assertTrue(row['pending_purge']);self.assertEqual(row['unconfirmed_devices'],1)
  with patch('academic_os.control.source_status',return_value={'generation':2,'purge_required':True}),patch('academic_os.control.collector_request'),patch('academic_os.control.purge_ack',return_value={'acknowledged':True}):reconcile(self.store,env)
  self.assertTrue({r['source_id']:r for r in sources(self.p)}[self.a]['pending_purge'])
  self.pair.acknowledge_purge(device,2,'applied')
  row={r['source_id']:r for r in sources(self.p)}[self.a];self.assertFalse(row['pending_purge']);self.assertEqual(row['purge_status'],'confirmed_known_inventory')
  self.assertEqual(len([e for e in self.store.evidence() if e['source_id']==self.b]),1)
  # Phone application alone cannot stand in for a Linux/cloud acknowledgment.
  other=str(uuid.uuid4());self.store.register_device(other,self.b,1,'synthetic')
  self.store.purge(self.b);self.pair.acknowledge_purge(other,2,'applied')
  self.assertTrue({r['source_id']:r for r in sources(self.p)}[self.b]['pending_purge'])
 def test_terminal_jobs_remain_navigable_after_first_hundred(self):
  for n in range(101):self.p.save('synthetic-job-'+str(n),self.a,'failed',{},'EXTRACTION_FAILED',create=True)
  first=self.p.jobs();self.assertEqual(len(first),100);self.assertNotIn('synthetic-job-0',{j['id'] for j in first})
  self.assertIn('Older jobs',page(self.p));second=self.p.jobs(first[-1]['cursor'])
  self.assertEqual([j['id'] for j in second],['synthetic-job-0']);self.assertIn('synthetic-job-0',page(self.p,before=first[-1]['cursor']))
 def test_authenticated_server_rendered_forms_have_scoped_actions_and_origin_gate(self):
  token=secrets.token_urlsafe(32);server=HTTPServer(('127.0.0.1',0),lambda *a:None);origin='http://127.0.0.1:'+str(server.server_port)
  server.RequestHandlerClass=make_handler(self.store,token,origin);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  def request(path,data=None,cookie=None,content='application/json',request_origin=origin):
   headers={'Origin':request_origin,'Content-Type':content}
   if cookie:headers['Cookie']=cookie
   return urllib.request.urlopen(urllib.request.Request(origin+path,data=data,headers=headers),timeout=5)
  try:
   with self.assertRaises(urllib.error.HTTPError) as denied:request('/operations')
   self.assertEqual(denied.exception.code,401)
   with request('/login',json.dumps({'token':token}).encode()) as r:cookie=r.headers['Set-Cookie'].split(';')[0]
   with request('/operations',cookie=cookie) as r:body=r.read().decode()
   self.assertIn(self.a,body);self.assertIn(self.b,body);self.assertEqual(body.count('name=source_id'),8)
   self.assertNotIn(token,body);self.assertNotIn('Synthetic source duty',body);self.assertIn('unavailable',body)
   form=urllib.parse.urlencode(self.value(self.a,'pause')).encode()
   with self.assertRaises(urllib.error.HTTPError) as denied:request('/operations/action',form,cookie,'application/x-www-form-urlencoded','https://evil.invalid')
   self.assertEqual(denied.exception.code,422);self.store.allowed(self.a,1)
   with request('/operations/action',form,cookie,'application/x-www-form-urlencoded') as r:self.assertIn('paused',r.read().decode())
   self.store.allowed(self.b,1)
   with self.store.db:self.store.db.execute('UPDATE sources SET generation=2 WHERE id=?',(self.a,))
   with self.assertRaises(urllib.error.HTTPError) as stale:request('/operations/action',form,cookie,'application/x-www-form-urlencoded')
   self.assertEqual(stale.exception.code,422);self.assertIn(b'SOURCE_GENERATION_CHANGED',stale.exception.read())
  finally:server.shutdown();server.server_close();thread.join()

if __name__=='__main__':unittest.main()
