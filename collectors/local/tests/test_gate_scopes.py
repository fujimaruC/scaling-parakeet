"""Gate3/Gate8 documentation guard unit cases, never external evidence."""
import importlib.util,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('aos_gate_claims',ROOT/'scripts/check_gate_claims.py')
guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)
class GateScopeTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);(self.root/'docs').mkdir()
  for name in ('STATUS.md','11-TEST-STRATEGY.md'):(self.root/'docs'/name).write_text((ROOT/'docs'/name).read_text())
 def tearDown(self):self.tmp.cleanup()
 def replace(self,name,before,after):
  p=self.root/'docs'/name;s=p.read_text();self.assertIn(before,s);p.write_text(s.replace(before,after,1))
 def test_required_gate3_and_gate8_rows_cannot_disappear(self):
  path=self.root/'docs/11-TEST-STRATEGY.md';original=path.read_text()
  for key in ('disposable-d1-local','synthetic-router-local','actual-provider-route','production-d1-restore'):
   path.write_text('\n'.join(line for line in original.splitlines() if not line.startswith('| '+key+' |')))
   with self.assertRaisesRegex(ValueError,'GATE_TABLE_INCOMPLETE'):guard.check(self.root)
 def test_exact_proof_required_and_stale_gate_sentence_blocks_promotion(self):
  for key,(target,sentence) in guard.KNOWN_SCOPES.items():
   for name in ('STATUS.md','11-TEST-STRATEGY.md'):(self.root/'docs'/name).write_text((ROOT/'docs'/name).read_text())
   strategy=self.root/'docs/11-TEST-STRATEGY.md';lines=strategy.read_text().splitlines()
   new='This scoped implementation is locally verified.'
   strategy.write_text('\n'.join(('| '+key+' | '+('8' if key=='disposable-d1-local' else '3')+' | '+target+' | locally_verified | '+new+' |') if line.startswith('| '+key+' |') else line for line in lines))
   status=self.root/'docs/STATUS.md';status.write_text(status.read_text().replace(sentence,sentence+' '+new))
   with self.assertRaisesRegex(ValueError,'GATE_CLAIM_CONTRADICTION'):guard.check(self.root)
   status.write_text(status.read_text().replace(sentence,''))
   with patch.object(guard,'run_named_proof') as proof:
    guard.check(self.root);self.assertTrue(any(call.args[1:]==(target,key) for call in proof.call_args_list))
   strategy.write_text(strategy.read_text().replace(target,'test_core.NotTheRequiredProof'))
   with self.assertRaisesRegex(ValueError,'GATE_EVIDENCE_SCOPE'):guard.check(self.root)
 def test_local_proof_cannot_promote_external_provider_or_production_restore(self):
  path=self.root/'docs/11-TEST-STRATEGY.md';original=path.read_text()
  for key in ('actual-provider-route','production-d1-restore'):
   lines=original.splitlines();updated=[]
   for line in lines:
    if line.startswith('| '+key+' |'):line=line.replace('| none | unverified |','| test_core.Fake | locally_verified |')
    updated.append(line)
   path.write_text('\n'.join(updated))
   with self.assertRaisesRegex(ValueError,'GATE_EXTERNAL_OBSERVATION_REQUIRED'):guard.check(self.root)
