"""Fault-controller checks. Synthetic reports here are not application evidence."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts'))
from mutation_harness import Case,assert_result
from run_fault_suites import validate_inventory,declared_cases
from fault_registry import SUITES
from gate_promotion import proposed_documents,PROMOTIONS

class FaultHarnessTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.result=self.root/'result.json'
    def tearDown(self):self.tmp.cleanup()
    def test_inventory_matches_files_and_owner_document_and_rejects_an_orphan(self):
        self.assertEqual(len(validate_inventory(ROOT)),len(SUITES))
        (self.root/'scripts').mkdir();(self.root/'docs/next-scope').mkdir(parents=True)
        for filename,_,_ in SUITES.values():(self.root/'scripts'/filename).write_text('CASES = []\n')
        rows='\n'.join('| scripts/'+filename+' | synthetic |' for filename,_,_ in SUITES.values())
        owner=self.root/'docs/next-scope/OWNER-VERIFY.md';owner.write_text('<!-- fault-runners:start -->\n'+rows+'\n<!-- fault-runners:end -->')
        validate_inventory(self.root)
        orphan=self.root/'scripts/check_unlisted_mutations.py';orphan.write_text('CASES=[]')
        with self.assertRaisesRegex(ValueError,'FAULT_INVENTORY_DRIFT'):validate_inventory(self.root)
        orphan.unlink();owner.write_text(owner.read_text().replace(rows.splitlines()[0],'',1))
        with self.assertRaisesRegex(ValueError,'FAULT_OWNER_LIST_DRIFT'):validate_inventory(self.root)
    def test_vitest_requires_a_real_named_assertion_and_rejects_setup_or_survivors(self):
        case=Case('synthetic','unused','','','vitest','fixture.test.ts','named invariant')
        self.result.write_text(json.dumps({'testResults':[]}))
        with self.assertRaisesRegex(RuntimeError,'ZERO_NAMED_ASSERTIONS'):assert_result(case,0,'',self.result,False)
        passed={'title':'named invariant','status':'passed','failureMessages':[]}
        self.result.write_text(json.dumps({'testResults':[{'assertionResults':[passed]}]}))
        assert_result(case,0,'',self.result,False)
        with self.assertRaisesRegex(RuntimeError,'SURVIVOR'):assert_result(case,0,'',self.result,True)
        failed={**passed,'status':'failed','failureMessages':['Error: socket setup failed']}
        self.result.write_text(json.dumps({'testResults':[{'assertionResults':[failed]}]}))
        with self.assertRaisesRegex(RuntimeError,'SURVIVOR_OR_WRONG_FAILURE'):assert_result(case,1,'',self.result,True)
        failed['failureMessages']=['AssertionError: intended row-count difference']
        self.result.write_text(json.dumps({'testResults':[{'assertionResults':[failed]}]}));assert_result(case,1,'',self.result,True)
        with self.assertRaisesRegex(RuntimeError,'HARNESS_OR_IMPORT_FAILURE'):assert_result(case,1,'Transform failed',self.result,True)
    def test_python_zero_cases_skips_and_import_errors_are_not_proof(self):
        case=Case('synthetic','unused','','','python','test_fixture.py','case')
        for output in ('Ran 0 tests\nOK','Ran 1 test\nOK (skipped=1)','ERROR: case\nRan 1 test\nAssertionError'):
            with self.assertRaises(RuntimeError):assert_result(case,1,output,self.result,True)
        assert_result(case,1,'FAIL: case\nAssertionError: intended\nRan 1 test',self.result,True)
    def test_gate_requires_both_named_proof_markers_even_with_zero_exit(self):
        case=Case('synthetic','unused','','','gate','','','GATE_CLAIM_DRIFT')
        with self.assertRaisesRegex(RuntimeError,'GATE_PROOF_NOT_EXECUTED'):assert_result(case,0,'PASS: 5 gate claims match',self.result,False)
        assert_result(case,1,'GATE_CLAIM_DRIFT fixture',self.result,True)
    def test_proposal_transformation_is_pure_and_keeps_external_halves_unverified(self):
        original={name:(ROOT/name).read_bytes() for name in ('docs/STATUS.md','docs/11-TEST-STRATEGY.md')}
        result=proposed_documents(ROOT)
        for _,(_,target,_,sentence) in PROMOTIONS.items():
            self.assertIn(target,result[Path('docs/11-TEST-STRATEGY.md')]);self.assertIn(sentence,result[Path('docs/STATUS.md')]);self.assertIn('unverified',sentence)
        for name,data in original.items():self.assertEqual((ROOT/name).read_bytes(),data)
        self.assertIn('| actual-provider-route | 3 | none | unverified |',result[Path('docs/11-TEST-STRATEGY.md')])
        self.assertIn('| production-d1-restore | 6 | none | unverified |',result[Path('docs/11-TEST-STRATEGY.md')])
    def test_all_case_counts_come_from_declarations_without_importing_runners(self):
        self.assertTrue(all(declared_cases(ROOT/'scripts'/entry[0])>0 for entry in SUITES.values()))

if __name__=='__main__':unittest.main()
