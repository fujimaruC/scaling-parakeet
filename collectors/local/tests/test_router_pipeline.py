"""Synthetic TLS router -> real shared Worker/Miniflare D1. No real provider/account."""
import collections,ipaddress,json,os,select,ssl,subprocess,sys,tempfile,threading,time,unittest,urllib.request,uuid
from datetime import datetime,timedelta,timezone
from pathlib import Path
from unittest.mock import patch
from cryptography import x509
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.core import Store,Invalid
from academic_os.pipeline import Pipeline
from academic_os.jobs import tick
from academic_os.synthetic_router import make_mock_server

class RouterPipelineTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.root=Path(__file__).resolve().parents[3];cls.source=str(uuid.uuid4());cls.assets=tempfile.TemporaryDirectory();directory=Path(cls.assets.name)
  private=rsa.generate_private_key(public_exponent=65537,key_size=2048);name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'synthetic-local-router')]);now=datetime.now(timezone.utc)
  cert=x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(private.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now-timedelta(days=1)).not_valid_after(now+timedelta(days=1)).add_extension(x509.SubjectAlternativeName([x509.IPAddress(ipaddress.ip_address('127.0.0.1'))]),critical=False).add_extension(x509.BasicConstraints(ca=True,path_length=None),critical=True).sign(private,hashes.SHA256())
  cls.cert=directory/'cert.pem';key=directory/'key.pem';cls.cert.write_bytes(cert.public_bytes(serialization.Encoding.PEM));key.write_bytes(private.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()));os.chmod(key,0o600)
  cls.tls=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);cls.tls.load_cert_chain(cls.cert,key);cls.client=ssl.create_default_context(cafile=str(cls.cert))
  cls.err=tempfile.TemporaryFile();cls.worker=subprocess.Popen(['node','--import','tsx','scripts/synthetic_sync_worker.ts'],cwd=cls.root,env={**os.environ,'SYNTHETIC_SOURCE_ID':cls.source},stdout=subprocess.PIPE,stderr=cls.err,text=True)
  deadline=time.monotonic()+45
  while time.monotonic()<deadline:
   if select.select([cls.worker.stdout],[],[],1)[0]:
    line=cls.worker.stdout.readline()
    if line.startswith('READY '):cls.port=int(line.split()[1]);break
    if not line:break
  else:line=''
  if not hasattr(cls,'port'):
   cls.worker.terminate();cls.worker.wait(timeout=15);cls.assets.cleanup();cls.err.close();raise RuntimeError('SYNTHETIC_WORKER_NOT_READY (npm ci required)')
 @classmethod
 def tearDownClass(cls):
  cls.worker.terminate()
  try:cls.worker.wait(timeout=15)
  except subprocess.TimeoutExpired:cls.worker.kill();cls.worker.wait()
  cls.worker.stdout.close();cls.err.close();cls.assets.cleanup()
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.store=Store(self.tmp.name);self.store.enroll(self.source);self.store.import_text(self.source,'05/11/26, 19.00 - Synthetic: Synthetic router duty')
  self.ids=[e['id'] for e in self.store.evidence()];self.now=1000
  self.server,self.state=make_mock_server(tls_context=self.tls,sync_port=self.port);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start();self.origin='https://127.0.0.1:'+str(self.server.server_port)
  self.env={'AI_BASE_URL':self.origin+'/v1','AI_PROVIDER_ID':'synthetic-local-only','AI_MODEL':'synthetic-model','AI_API_KEY':'synthetic-not-real','AI_POLICY_VERSION':'1','ACADEMIC_OS_API_URL':self.origin+'/api/v1','COLLECTOR_KEY_ID':'synthetic-key','COLLECTOR_HMAC_SECRET':'synthetic-not-real','COLLECTOR_SOURCE_ID':self.source}
  real_open=urllib.request.urlopen
  def local_only(request,*args,**kwargs):
   url=request.full_url if hasattr(request,'full_url') else request
   if not str(url).startswith(self.origin+'/'):raise AssertionError('UNEXPECTED_EXTERNAL_REQUEST')
   return real_open(request,*args,context=self.client,**kwargs)
  self.patched=patch('urllib.request.urlopen',side_effect=local_only);self.patched.start();self.p=Pipeline(self.store,self.env,clock=lambda:self.now)
  self.p.consent(self.source,True)
 def tearDown(self):
  self.patched.stop();self.server.shutdown();self.server.server_close();self.thread.join();self.store.db.close();self.tmp.cleanup()
 def scenario(self,*values):
  with self.state.lock:self.state.scenarios=collections.deque(values)
 def state_of_worker(self):
  with urllib.request.build_opener(urllib.request.ProxyHandler({})).open('http://127.0.0.1:'+str(self.port)+'/__synthetic/state',timeout=10) as r:return json.load(r)
 def test_consent_retry_projection_queue_and_real_sync_commit(self):
  before=self.state_of_worker();self.scenario('429','valid')
  with self.assertRaisesRegex(Invalid,'EXTRACTION_FAILED'):self.p.run(self.source,self.ids)
  ident=self.p.jobs()[0]['id'];self.assertEqual(self.p.get(ident)['retry']['next_attempt_at'],1030)
  self.assertEqual(tick(self.p,self.source)['state'],'idle');self.assertEqual(self.state.calls,1)
  self.now=1030;tick(self.p,self.source);job=self.p.get(ident)
  self.assertEqual(job['state'],'awaiting_projection_review');self.assertEqual(self.state.calls,2);self.assertFalse(self.state.tools_observed)
  self.assertTrue(all(c['needs_review'] for c in job['payload']['envelope']['candidates']))
  with self.assertRaisesRegex(Invalid,'PROJECTION_REVIEW_REQUIRED'):self.p.send(ident)
  with self.assertRaisesRegex(Invalid,'PROJECTION_REVIEW_REQUIRED'):self.p.queue(ident,False)
  self.assertEqual(self.state.sync_calls,0);self.p.queue(ident,True)
  immutable=self.p.get(ident)['payload']['envelope'];self.assertEqual(self.p.send(ident)['state'],'synced')
  self.assertEqual(self.p.get(ident)['payload']['envelope'],immutable);after=self.state_of_worker()
  self.assertEqual(after['candidates'],before['candidates']+1);self.assertEqual(after['items'],before['items']+1);self.assertEqual(after['tasks'],0)
  self.p.send(ident);self.assertEqual(self.state.sync_calls,1)
 def test_malformed_or_schema_invalid_output_stops_before_projection(self):
  for response in ('malformed','invalid-schema'):
   self.scenario(response);before=self.state.calls
   with self.assertRaisesRegex(Invalid,'EXTRACTION_FAILED'):self.p.run(self.source,self.ids)
   ident=self.p.jobs()[0]['id'];self.assertEqual(self.p.get(ident)['retry']['state'],'failed');self.now+=100000
   tick(self.p,self.source);self.assertEqual(self.state.calls,before+1);self.assertEqual(self.state.sync_calls,0)
 def test_5xx_is_unknown_and_never_automatically_replayed(self):
  self.scenario('500','valid')
  with self.assertRaisesRegex(Invalid,'EXTRACTION_FAILED'):self.p.run(self.source,self.ids)
  job=self.p.jobs()[0];self.assertEqual(job['retry']['state'],'unknown');self.now+=100000
  self.assertEqual(tick(self.p,self.source)['state'],'idle');self.assertEqual(self.state.calls,1);self.assertEqual(self.state.sync_calls,0)
 def test_absent_or_changed_policy_refuses_before_next_provider_call(self):
  self.p.consent(self.source,False)
  with self.assertRaisesRegex(Invalid,'CONSENT_REQUIRED'):self.p.run(self.source,self.ids)
  self.assertEqual(self.state.calls,0);self.p.consent(self.source,True);self.scenario('429','valid')
  with self.assertRaisesRegex(Invalid,'EXTRACTION_FAILED'):self.p.run(self.source,self.ids)
  ident=self.p.jobs()[0]['id'];self.env['AI_POLICY_VERSION']='2';self.now=1030;tick(self.p,self.source)
  self.assertEqual(self.state.calls,1);self.assertEqual(self.p.get(ident)['retry']['state'],'failed');self.assertEqual(self.state.sync_calls,0)
 def test_429_exhaustion_remains_bounded(self):
  self.scenario('429','429','valid')
  with self.assertRaisesRegex(Invalid,'EXTRACTION_FAILED'):self.p.run(self.source,self.ids)
  ident=self.p.jobs()[0]['id'];self.now=1030;tick(self.p,self.source)
  self.assertEqual(self.p.get(ident)['retry']['state'],'exhausted');self.now+=100000
  self.assertEqual(tick(self.p,self.source)['state'],'idle');self.assertEqual(self.state.calls,2)
