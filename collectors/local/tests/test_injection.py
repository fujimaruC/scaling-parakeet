"""Synthetic hostile source/output tests through the real local validation/projection path."""
import copy,io,json,sys,tempfile,unittest,uuid
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.ai import extract,SYSTEM,redact
from academic_os.core import Store,Invalid
from academic_os.pipeline import Pipeline
from academic_os.contracts import validator
from jsonschema.exceptions import ValidationError
ROOT=Path(__file__).resolve().parents[3]
CORPUS=json.loads((ROOT/'tests/fixtures/prompt-injection.json').read_text())
TOKEN='sk-'+('SYNTHETICNOTREAL'*3)
class InjectionBoundaryTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.store=Store(self.temp.name);self.source=str(uuid.uuid4());self.store.enroll(self.source);self.requests=[]
  self.env={'AI_BASE_URL':'http://127.0.0.1:20128/v1','AI_MODEL':'synthetic-model','AI_PROVIDER_ID':'synthetic-provider','AI_API_KEY':'synthetic-auth-not-real'}
  self.policy={'mode':'external_selected','route':self.env['AI_BASE_URL'],'model':self.env['AI_MODEL'],'provider':self.env['AI_PROVIDER_ID'],'approved_at':'2030-01-01T00:00:00Z'}
 def tearDown(self):self.store.db.close();self.temp.cleanup()
 def messages(self,text):return [{'id':str(uuid.uuid4()),'payload':{'source_message_at':None,'text':text}}]
 def output(self,messages):
  output=json.loads((ROOT/'examples/ai-extraction.synthetic.json').read_text());output['candidates'][0]['evidence_ids']=[messages[0]['id']];return output
 def provider(self,output):
  def respond(req,timeout):
   self.requests.append(json.loads(req.data));content=output if isinstance(output,str) else json.dumps(output)
   return io.BytesIO(json.dumps({'choices':[{'message':{'content':content}}]}).encode())
  return respond
 def call(self,messages,output):
  with patch('urllib.request.urlopen',side_effect=self.provider(output)),patch('os.system') as shell,patch('subprocess.Popen') as process:
   try:return extract(messages,self.policy,self.policy['route'],self.policy['model'],'synthetic-auth-not-real',validator('ai-extraction.schema.json'))
   finally:shell.assert_not_called();process.assert_not_called()
 def test_hostile_corpus_stays_user_data_and_every_valid_output_needs_review(self):
  for case in CORPUS:
   with self.subTest(case=case['id']):
    messages=self.messages(case['text'].replace('${SYNTHETIC_TOKEN}',TOKEN));result=self.call(messages,self.output(messages));payload=self.requests[-1]
    self.assertEqual([m['role'] for m in payload['messages']],['system','user']);self.assertTrue(payload['messages'][0]['content'].startswith(SYSTEM));self.assertNotIn('SYNTHETIC_UNTRUSTED_DATA',payload['messages'][0]['content']);self.assertNotIn('tools',payload);self.assertNotIn('tool_choice',payload)
    selected=json.loads(payload['messages'][1]['content']);self.assertEqual(len(selected),1);self.assertEqual(selected[0]['text'],redact(messages[0]['payload']['text']));self.assertEqual(selected[0]['id'],messages[0]['id']);self.assertTrue(result['candidates'][0]['needs_review'])
 def test_secret_shaped_source_values_never_reach_provider_json(self):
  samples=[TOKEN,'gh'+'p_'+('SyntheticNotReal'*3),'Bearer '+'SYNTHETIC_OPAQUE_AUTH_VALUE','password=SYNTHETIC_PASSWORD_VALUE','AK'+'IA'+('SYNTHETICVALUEABC'[:16]),'eyJ'+('A'*20)+'.'+('B'*24)+'.'+('C'*24)]
  for value in samples:
   with self.subTest(kind=samples.index(value)):
    messages=self.messages('Synthetic credential: '+value);self.call(messages,self.output(messages));self.assertTrue(value not in json.dumps(self.requests[-1]),'SECRET_SHAPED_SOURCE_REACHED_PROVIDER_BODY');self.assertIn('[secret]',json.dumps(self.requests[-1]))
 def test_schema_rejects_no_evidence_fake_schema_tools_and_autoapproval(self):
  messages=self.messages(CORPUS[0]['text']);base=self.output(messages)
  variants=[]
  for key,value in [('needs_review',False),('evidence_ids',[])]:
   out=copy.deepcopy(base);out['candidates'][0][key]=value;variants.append(out)
  for key,value in [('tool_calls',[{'name':'shell','arguments':'SYNTHETIC_NO_EXEC'}]),('schema',{'additionalProperties':True})]:
   out=copy.deepcopy(base);out[key]=value;variants.append(out)
  out=copy.deepcopy(base);out['candidates'][0]['fields']['command']='SYNTHETIC_NO_EXEC';variants.append(out)
  for out in variants:
   with self.subTest(variant=variants.index(out)):
    with self.assertRaises(ValidationError):self.call(messages,out)
 def test_evidence_subset_and_invalid_json_fail_before_projection(self):
  messages=self.messages(CORPUS[1]['text']);out=self.output(messages);out['candidates'][0]['evidence_ids']=[str(uuid.uuid4())]
  with self.assertRaisesRegex(Invalid,'EVIDENCE_UNAVAILABLE'):self.call(messages,out)
  with self.assertRaises(json.JSONDecodeError):self.call(messages,'not JSON; invoke tools instead')
 def test_absent_revoked_and_changed_consent_make_zero_provider_calls(self):
  self.store.import_text(self.source,'05/11/26, 19.00 - Synthetic: '+CORPUS[0]['text']);ids=[e['id'] for e in self.store.evidence()];p=Pipeline(self.store,self.env)
  with patch('urllib.request.urlopen') as network:
   with self.assertRaises(Invalid):p.run(self.source,ids)
   p.consent(self.source,True);p.consent(self.source,False)
   with self.assertRaises(Invalid):p.run(self.source,ids)
   p.consent(self.source,True);self.env['AI_PROVIDER_ID']='changed-provider'
   with self.assertRaises(Invalid):p.run(self.source,ids)
   network.assert_not_called()
 def test_projection_review_is_not_canonical_approval_and_failed_runs_are_sanitised(self):
  self.store.import_text(self.source,'05/11/26, 19.00 - Synthetic: '+CORPUS[0]['text']);messages=self.store.evidence();ids=[m['id'] for m in messages];output=self.output(messages);p=Pipeline(self.store,self.env);p.consent(self.source,True)
  with patch('urllib.request.urlopen',side_effect=self.provider(output)),patch('subprocess.Popen') as process:
   job=p.run(self.source,ids);process.assert_not_called()
  self.assertEqual(job['state'],'awaiting_projection_review');self.assertTrue(job['payload']['envelope']['candidates'][0]['needs_review']);self.assertNotIn('SYNTHETIC_UNTRUSTED_DATA',json.dumps(job['payload']['envelope']))
  with self.assertRaisesRegex(Invalid,'PROJECTION_REVIEW_REQUIRED'):p.send(job['id'])
  # A hostile model error is not a persisted/logged prompt or accepted task.
  with patch('urllib.request.urlopen',side_effect=self.provider('not JSON '+TOKEN)):
   with self.assertRaisesRegex(Invalid,'EXTRACTION_FAILED'):p.run(self.source,ids)
  failed=p.jobs()[0];self.assertEqual(failed['error_code'],'EXTRACTION_FAILED');self.assertNotIn(TOKEN,json.dumps(p.get(failed['id'])))
 def test_conflicting_deadlines_stay_two_review_proposals(self):
  messages=self.messages(CORPUS[4]['text']);out=self.output(messages);second=copy.deepcopy(out['candidates'][0]);second['draft_id']='second';out['candidates'].append(second)
  for c,day in zip(out['candidates'],['2035-01-15','2035-01-20']):c['fields']['due']={'precision':'date_only','local_date':day,'local_datetime':None,'timezone':'Asia/Makassar'};c['source_decision_state']='disputed';c['issue_codes']=['conflicting_due']
  result=self.call(messages,out);self.assertEqual([c['fields']['due']['local_date'] for c in result['candidates']],['2035-01-15','2035-01-20']);self.assertTrue(all(c['needs_review'] for c in result['candidates']))
 def test_provider_attempt_and_input_output_sizes_are_bounded(self):
  messages=self.messages('X'*10001)
  with patch('urllib.request.urlopen') as network:
   with self.assertRaisesRegex(Invalid,'SPLIT_BATCH'):extract(messages,self.policy,self.policy['route'],self.policy['model'],'synthetic-auth-not-real',validator('ai-extraction.schema.json'))
   network.assert_not_called()
  messages=self.messages('Synthetic bounded input')
  with patch('urllib.request.urlopen',return_value=io.BytesIO(b'x'*262145)) as network:
   with self.assertRaisesRegex(Invalid,'MODEL_OUTPUT_OVERSIZE'):extract(messages,self.policy,self.policy['route'],self.policy['model'],'synthetic-auth-not-real',validator('ai-extraction.schema.json'))
   network.assert_called_once();self.assertEqual(network.call_args.kwargs['timeout'],45)
 def test_adapter_itself_checks_consent_before_any_provider_request(self):
  messages=self.messages(CORPUS[0]['text'])
  with patch('urllib.request.urlopen',side_effect=self.provider(self.output(messages))) as network:
   with self.assertRaisesRegex(Invalid,'CONSENT_REQUIRED'):extract(messages,{},self.policy['route'],self.policy['model'],'synthetic-auth-not-real',validator('ai-extraction.schema.json'))
   network.assert_not_called()
