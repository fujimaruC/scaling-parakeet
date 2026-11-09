"""Check the small explicit gate -> test -> claim table, including real test runs."""
import argparse
import io
from pathlib import Path
import re
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]

def check(root=ROOT):
    strategy=(root/'docs/11-TEST-STRATEGY.md').read_text()
    table=strategy.split('<!-- gate-claims:start -->',1)[1].split('<!-- gate-claims:end -->',1)[0]
    section=(root/'docs/STATUS.md').read_text().split('## Remaining implementation and release gates',1)[1].split('\n## ',1)[0]
    gates={m.group(1):m.group(2).strip() for m in re.finditer(r'^([1-9][0-9]*)\. (.*?)(?=\n[1-9][0-9]*\. |\n\n|\Z)',section,re.M|re.S)}
    rows=[line.strip().strip('|').split('|') for line in table.splitlines() if line.startswith('| ')][1:]
    if not rows:raise ValueError('GATE_TABLE_EMPTY')
    sys.path.insert(0,str(root/'collectors/local/tests'))
    sys.path.insert(0,str(root/'collectors/local/src'))
    for row in rows:
        key,number,test,claim,sentence=[v.strip() for v in row]
        if sentence not in gates.get(number,''):raise ValueError('GATE_CLAIM_DRIFT '+key)
        if claim=='locally_verified':
            if test=='none' or 'locally verified' not in sentence:raise ValueError('GATE_EVIDENCE_MISSING '+key)
            # A mere import/name match is insufficient: run the exact assertion.
            loader=unittest.TestLoader();suite=loader.loadTestsFromName(test)
            if loader.errors or suite.countTestCases()!=1:raise ValueError('GATE_TEST_UNAVAILABLE '+key)
            output=io.StringIO();result=unittest.TextTestRunner(stream=output,verbosity=2).run(suite)
            print(output.getvalue(),end='')
            if not result.wasSuccessful() or result.skipped:raise ValueError('GATE_TEST_FAILED '+key)
        elif claim=='unverified':
            if test!='none' or 'unverified' not in sentence:raise ValueError('GATE_CLAIM_CONTRADICTION '+key)
        else:raise ValueError('GATE_CLAIM_UNKNOWN '+key)
        print('PASS gate '+key+': '+claim)
    return len(rows)

def main():
    try:count=check();print(f'PASS: {count} gate claims match their scoped evidence.')
    except (ValueError,IndexError,KeyError) as error:raise SystemExit(str(error)) from None
if __name__=='__main__':main()
