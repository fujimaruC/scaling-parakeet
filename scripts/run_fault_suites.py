"""Owner/CI sequential fault entry point. --list never runs a test."""
import argparse
import ast
import json
import os
from pathlib import Path
import re
import sys
from fault_registry import SUITES
from mutation_harness import ROOT, run_process

def validate_inventory(root=ROOT):
    actual = {p.name for p in (root / 'scripts').glob('check_*_mutations.py')}
    expected = {value[0] for value in SUITES.values()}
    if actual != expected or len(expected) != len(SUITES):
        raise ValueError('FAULT_INVENTORY_DRIFT ' + json.dumps({'missing': sorted(expected - actual), 'unlisted': sorted(actual - expected)}))
    text = (root / 'docs/next-scope/OWNER-VERIFY.md').read_text()
    section = text.split('<!-- fault-runners:start -->', 1)[1].split('<!-- fault-runners:end -->', 1)[0]
    documented = re.findall(r'^\| scripts/(check_[a-z0-9_]+_mutations\.py) \|', section, re.M)
    if set(documented) != expected or len(documented) != len(expected):
        raise ValueError('FAULT_OWNER_LIST_DRIFT')
    return sorted(actual)


def declared_cases(path):
    # Inventory is syntax data. Never import a runner merely to count its cases.
    tree = ast.parse(path.read_text())
    declarations = [n for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'CASES' for t in n.targets)]
    if len(declarations) != 1 or not isinstance(declarations[0].value, ast.List):
        raise ValueError('FAULT_CASE_DECLARATION_INVALID ' + path.name)
    return len(declarations[0].value.elts)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path)
    parser.add_argument('--list', action='store_true')
    parser.add_argument('--suite', action='append', choices=list(SUITES))
    args = parser.parse_args()
    validate_inventory()
    if args.list:
        print(json.dumps([{ 'suite': key, 'runner': value[0], 'declared_cases': declared_cases(ROOT / 'scripts' / value[0]), 'hard_budget_seconds': value[1], 'prerequisites': value[2], 'measured_seconds': None } for key, value in SUITES.items()], indent=2))
        return
    if not args.output_dir:
        parser.error('--output-dir is required unless --list')
    out = args.output_dir.resolve()
    if out == ROOT or ROOT in out.parents:
        parser.error('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY')
    out.mkdir(parents=True, exist_ok=True, mode=0o700)
    if any(out.iterdir()):
        parser.error('OUTPUT_MUST_BE_EMPTY')
    selected = args.suite or list(SUITES)
    if len(selected) != len(set(selected)):
        parser.error('DUPLICATE_SUITE')
    report = {'status': 'incomplete', 'full_inventory': args.suite is None, 'suites': []}
    try:
        for key in selected:
            report['running_suite'] = key
            (out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
            filename, budget, _ = SUITES[key]
            command = [sys.executable, str(ROOT / 'scripts' / filename), '--output-dir', str(out / key)]
            print('RUN ' + key + ' (sequential; ceiling ' + str(budget) + 's)', flush=True)
            code, output, elapsed = run_process(command, ROOT, out / (key + '.log'), budget, {**os.environ, 'AOS_TEST_PYTHON': sys.executable})
            print(output, end='', flush=True)
            report['suites'].append({'suite': key, 'exit_code': code, 'elapsed_seconds': elapsed, 'declared_cases': declared_cases(ROOT / 'scripts' / filename)})
            (out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
            if code or not re.search(r'PASS:.*0 survivors', output):
                raise RuntimeError('FAULT_SUITE_FAILED ' + key)
        report['status'] = 'passed'
        report['running_suite'] = None
    finally:
        (out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')

if __name__ == '__main__':
    main()
