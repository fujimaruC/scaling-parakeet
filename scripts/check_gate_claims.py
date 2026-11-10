"""Check the small explicit gate -> test -> claim table, including real test runs."""
import argparse
import io
from pathlib import Path
import re
import sys
import unittest
import json
import subprocess

ROOT=Path(__file__).resolve().parents[1]
KNOWN_SCOPES={
 'disposable-d1-local':('vitest:tests/integration/d1-restore.test.ts::disposable D1 restores all canonical tables with parity and future-only rebuilds','Disposable D1 canonical restore execution remains unverified.'),
 'synthetic-router-local':('test_router_pipeline.RouterPipelineTests.test_consent_retry_projection_queue_and_real_sync_commit','Synthetic router end-to-end execution remains unverified.'),
}
REQUIRED_KEYS={'backup-tombstones-sqlite','production-d1-restore','disposable-d1-local','synthetic-router-local','actual-provider-route'}
def run_named_proof(root,test,key):
    if test.startswith('vitest:'):
        target,separator,title=test[len('vitest:'):].partition('::')
        if not separator or not title or target!='tests/integration/d1-restore.test.ts':raise ValueError('GATE_TEST_UNAVAILABLE '+key)
        command=[str(root/'node_modules/.bin/vitest'),'run',target,'-t','^'+re.escape(title)+'$','--reporter=json']
        try:result=subprocess.run(command,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=180)
        except (OSError,subprocess.TimeoutExpired):raise ValueError('GATE_TEST_UNAVAILABLE '+key) from None
        # Print real output. A successful command with no matching assertion is
        # not proof; require exactly the named passing, non-skipped case.
        print(result.stdout,end='');print(result.stderr,end='',file=sys.stderr)
        try:report=json.loads(result.stdout[result.stdout.index('{'):])
        except (ValueError,KeyError):raise ValueError('GATE_TEST_FAILED '+key) from None
        assertions=[case for group in report.get('testResults',[]) for case in group.get('assertionResults',[])]
        passed=[case for case in assertions if case.get('status')=='passed']
        if result.returncode or len(passed)!=1 or passed[0].get('title')!=title or any(case.get('status')=='failed' for case in assertions):raise ValueError('GATE_TEST_FAILED '+key)
    else:
        loader=unittest.TestLoader();suite=loader.loadTestsFromName(test)
        if loader.errors or suite.countTestCases()!=1:raise ValueError('GATE_TEST_UNAVAILABLE '+key)
        output=io.StringIO();result=unittest.TextTestRunner(stream=output,verbosity=2).run(suite)
        print(output.getvalue(),end='')
        if not result.wasSuccessful() or result.skipped:raise ValueError('GATE_TEST_FAILED '+key)


def check(root=ROOT):
    strategy=(root/'docs/11-TEST-STRATEGY.md').read_text()
    table=strategy.split('<!-- gate-claims:start -->',1)[1].split('<!-- gate-claims:end -->',1)[0]
    section=(root/'docs/STATUS.md').read_text().split('## Remaining implementation and release gates',1)[1].split('\n## ',1)[0]
    gates={m.group(1):m.group(2).strip() for m in re.finditer(r'^([1-9][0-9]*)\. (.*?)(?=\n[1-9][0-9]*\. |\n\n|\Z)',section,re.M|re.S)}
    rows=[line.strip().strip('|').split('|') for line in table.splitlines() if line.startswith('| ')][1:]
    if not rows:raise ValueError('GATE_TABLE_EMPTY')
    keys=[row[0].strip() for row in rows]
    if len(keys)!=len(set(keys)) or not REQUIRED_KEYS<=set(keys):raise ValueError('GATE_TABLE_INCOMPLETE')
    sys.path.insert(0,str(root/'collectors/local/tests'))
    sys.path.insert(0,str(root/'collectors/local/src'))
    for row in rows:
        key,number,test,claim,sentence=[v.strip() for v in row]
        if sentence not in gates.get(number,''):raise ValueError('GATE_CLAIM_DRIFT '+key)
        if key in {'actual-provider-route','production-d1-restore'} and claim!='unverified':raise ValueError('GATE_EXTERNAL_OBSERVATION_REQUIRED '+key)
        if claim=='locally_verified':
            if test=='none' or 'locally verified' not in sentence:raise ValueError('GATE_EVIDENCE_MISSING '+key)
            if key in KNOWN_SCOPES:
                expected,contradiction=KNOWN_SCOPES[key]
                if test!=expected:raise ValueError('GATE_EVIDENCE_SCOPE '+key)
                if contradiction in gates.get(number,''):raise ValueError('GATE_CLAIM_CONTRADICTION '+key)
            run_named_proof(root,test,key)
        elif claim=='unverified':
            if test!='none' or 'unverified' not in sentence:raise ValueError('GATE_CLAIM_CONTRADICTION '+key)
        else:raise ValueError('GATE_CLAIM_UNKNOWN '+key)
        print('PASS gate '+key+': '+claim)
    return len(rows)

def main():
    try:count=check();print(f'PASS: {count} gate claims match their scoped evidence.')
    except (ValueError,IndexError,KeyError) as error:raise SystemExit(str(error)) from None
if __name__=='__main__':main()
