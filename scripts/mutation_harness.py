"""Bounded private-copy fault execution. Only explicit CLI calls run tests."""
from __future__ import annotations
import argparse
from contextlib import contextmanager
from dataclasses import dataclass
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
IGNORED = shutil.ignore_patterns('node_modules', 'dist', 'build', '.gradle', '.kotlin', '.wrangler', '__pycache__', '*.pyc', '.venv*', 'local.properties', '*.jks', '*.keystore')

@dataclass(frozen=True)
class Case:
    name: str
    path: str
    before: str
    after: str
    kind: str
    target: str
    selector: str = ''
    expected: str = ''
    regex: bool = False

@contextmanager
def private_fixture(root=ROOT):
    with tempfile.TemporaryDirectory(prefix='aos-fault-') as temporary:
        work = Path(temporary)
        for name in ('apps', 'packages', 'tests', 'schemas', 'collectors', 'examples', 'scripts', 'docs', '.github'):
            if (root / name).exists():
                shutil.copytree(root / name, work / name, ignore=IGNORED)
        for name in ('package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts', 'playwright.config.ts', 'playwright.production.config.ts'):
            if (root / name).exists():
                shutil.copy2(root / name, work / name)
        if (root / 'node_modules').is_dir():
            (work / 'node_modules').symlink_to(root / 'node_modules', target_is_directory=True)
        yield work


def run_process(command, cwd, log, timeout, env=None):
    """Kill the entire child process group on timeout; retain real output."""
    started = time.monotonic()
    log.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with log.open('w') as stream:
        os.chmod(log, 0o600)
        stream.write('COMMAND: ' + json.dumps(command) + '\n')
        stream.flush()
        child = subprocess.Popen(command, cwd=cwd, env=env, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            code = child.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGTERM)
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()
            stream.write('\nTIMEOUT: incomplete execution is not a killed mutant.\n')
            raise RuntimeError('COMMAND_TIMEOUT ' + log.name) from None
        # A normally exited runner must not leave a web server/Gradle child
        # holding a port into the next phase. The process group is private.
        try:
            os.killpg(child.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        stream.write('\nEXIT: ' + str(code) + '\n')
    return code, log.read_text(), round(time.monotonic() - started, 3)


def execution_command(case, work, result, args):
    if case.kind == 'vitest':
        return [str(ROOT / 'node_modules/.bin/vitest'), 'run', case.target, '-t', case.selector, '--reporter=json', '--outputFile=' + str(result)], work, 120
    if case.kind == 'python':
        return [sys.executable, '-B', '-m', 'unittest', 'discover', '-s', 'collectors/local/tests', '-p', case.target, '-k', case.selector, '-v'], work, 90
    if case.kind == 'browser':
        return [str(ROOT / 'node_modules/.bin/playwright'), 'test', case.target, '--grep', case.selector, '--reporter=json', '--workers=1'], work, 180
    if case.kind == 'gate':
        return [sys.executable, '-B', 'scripts/check_gate_claims.py'], work, 240
    if case.kind == 'gradle':
        java_home = args.java_home or os.environ.get('JAVA_HOME')
        android_home = args.android_home or os.environ.get('ANDROID_HOME')
        if not java_home or not android_home:
            raise RuntimeError('ANDROID_ENV_REQUIRED: --java-home/JAVA_HOME and --android-home/ANDROID_HOME')
        return ['./gradlew', case.target, '--console=plain', '--no-daemon', '-Dorg.gradle.java.home=' + java_home], work / 'apps/android-companion', 300
    raise RuntimeError('UNKNOWN_CASE_KIND ' + case.kind)


def _browser_report(output):
    decoder = json.JSONDecoder()
    for match in re.finditer(r'\{', output):
        try:
            value, _ = decoder.raw_decode(output[match.start():])
            if isinstance(value, dict) and 'suites' in value and 'stats' in value:
                return value
        except ValueError:
            pass
    raise RuntimeError('BROWSER_RESULT_MISSING')


def assert_result(case, code, output, result, broken):
    # Compiler diagnostics are intentional only for explicit API-surface cases.
    fatal = r'SyntaxError|Transform failed|Failed to load|FAILED \(errors=|Test timeout of|Timed out waiting.*webServer'
    if case.kind != 'gradle' and re.search(fatal, output):
        raise RuntimeError('HARNESS_OR_IMPORT_FAILURE ' + case.name)
    if case.kind == 'vitest':
        if not result.is_file():
            raise RuntimeError('VITEST_RESULT_MISSING ' + case.name)
        report = json.loads(result.read_text())
        assertions = [a for group in report.get('testResults', []) for a in group.get('assertionResults', [])]
        selected = [a for a in assertions if re.search(case.selector, a.get('fullName', a.get('title', '')))]
        if not selected:
            raise RuntimeError('ZERO_NAMED_ASSERTIONS ' + case.name)
        if broken:
            # Vitest reports expect(p).rejects/resolves failures as plain
            # Error('promise ... instead of rejecting/resolving'), not AssertionError.
            shape = r'AssertionError|instead of rejecting|instead of resolving'
            failed = [a for a in selected if a.get('status') == 'failed' and re.search(shape, '\n'.join(a.get('failureMessages', [])))]
            if not code or not failed:
                raise RuntimeError('SURVIVOR_OR_WRONG_FAILURE ' + case.name)
        elif code or any(a.get('status') != 'passed' for a in selected) or report.get('numFailedTests'):
            raise RuntimeError('CLEAN_PROOF_FAILED ' + case.name)
    elif case.kind == 'python':
        if not re.search(r'Ran [1-9][0-9]* tests?', output):
            raise RuntimeError('ZERO_PYTHON_TESTS ' + case.name)
        if broken:
            if not code or 'FAIL:' not in output or 'AssertionError' not in output or 'ERROR:' in output:
                raise RuntimeError('SURVIVOR_OR_WRONG_FAILURE ' + case.name)
        elif code or not re.search(r'^OK\s*$', output, re.M) or 'skipped=' in output:
            raise RuntimeError('CLEAN_PROOF_FAILED ' + case.name)
    elif case.kind == 'browser':
        report = _browser_report(output)
        specs = []
        def visit(suite):
            specs.extend(suite.get('specs', []))
            for child in suite.get('suites', []):
                visit(child)
        for suite in report['suites']:
            visit(suite)
        chosen = [s for s in specs if re.search(case.selector, s.get('title', ''))]
        results = [r for spec in chosen for test in spec.get('tests', []) for r in test.get('results', [])]
        if not results or report.get('errors'):
            raise RuntimeError('BROWSER_HARNESS_FAILURE ' + case.name)
        if broken:
            failures = [r for r in results if r.get('status') == 'failed' and re.search(r'expect\(|expect\(received\)|AssertionError', json.dumps(r.get('errors', r.get('error', {}))))]
            if not code or not failures:
                raise RuntimeError('SURVIVOR_OR_WRONG_FAILURE ' + case.name)
        elif code or any(r.get('status') != 'passed' for r in results):
            raise RuntimeError('CLEAN_PROOF_FAILED ' + case.name)
    elif case.kind == 'gate':
        if broken:
            if not code or not case.expected or case.expected not in output:
                raise RuntimeError('GATE_WRONG_FAILURE ' + case.name)
        elif code or 'PASS: 5 gate claims match' not in output or not all('PROOF ' + k + ' PASS' in output for k in ('disposable-d1-local', 'synthetic-router-local')):
            raise RuntimeError('GATE_PROOF_NOT_EXECUTED ' + case.name)
    else:
        if broken:
            if not code or not case.expected or case.expected not in output:
                raise RuntimeError('GRADLE_WRONG_FAILURE ' + case.name)
        elif code or 'BUILD SUCCESSFUL' not in output:
            raise RuntimeError('CLEAN_PROOF_FAILED ' + case.name)


def run_suite(name, cases, budget, prepare=None, argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--case', action='append', default=[], help='Explicit subset; report never calls it a full suite')
    parser.add_argument('--java-home')
    parser.add_argument('--android-home')
    args = parser.parse_args(argv)
    out = args.output_dir.resolve()
    if out == ROOT or ROOT in out.parents:
        parser.error('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY')
    out.mkdir(parents=True, exist_ok=True, mode=0o700)
    if any(out.iterdir()):
        parser.error('OUTPUT_MUST_BE_EMPTY: preserve evidence from previous runs')
    chosen = [c for c in cases if not args.case or c.name in args.case]
    if not chosen or set(args.case) - {c.name for c in cases}:
        parser.error('UNKNOWN_OR_EMPTY_CASE_SELECTION')
    report = {'suite': name, 'status': 'incomplete', 'full_suite': not args.case, 'declared_cases': len(cases), 'selected_cases': len(chosen), 'budget_seconds': budget, 'cases': [], 'elapsed_seconds': None}
    started = time.monotonic()
    def persist():
        report['elapsed_seconds'] = round(time.monotonic() - started, 3)
        (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'AOS_TEST_PYTHON': sys.executable}
    if args.android_home:
        env['ANDROID_HOME'] = args.android_home
    try:
        with private_fixture() as work:
            if prepare:
                prepare(work)
            # Validate every anchor before spending time on any child command.
            for case in chosen:
                text = (work / case.path).read_text()
                count = len(re.findall(case.before, text)) if case.regex else text.count(case.before)
                if count != 1:
                    raise RuntimeError('MISSING_OR_NONUNIQUE_ANCHOR ' + case.name + ': ' + str(count))
            for case in chosen:
                target = work / case.path
                original = target.read_bytes()
                row = {'name': case.name, 'phases': {}, 'status': 'incomplete'}
                report['cases'].append(row)
                def run(phase):
                    remaining = budget - (time.monotonic() - started)
                    if remaining <= 0:
                        raise RuntimeError('SUITE_TIMEOUT ' + name)
                    result = out / (case.name + '-' + phase + '.json')
                    command, cwd, limit = execution_command(case, work, result, args)
                    code, output, elapsed = run_process(command, cwd, out / (case.name + '-' + phase + '.log'), min(limit, remaining), env)
                    row['phases'][phase] = {'exit_code': code, 'elapsed_seconds': elapsed}
                    persist()
                    assert_result(case, code, output, result, phase == 'broken')
                run('baseline')
                try:
                    text = original.decode()
                    altered = re.sub(case.before, case.after, text, count=1) if case.regex else text.replace(case.before, case.after, 1)
                    target.write_text(altered)
                    run('broken')
                finally:
                    target.write_bytes(original)
                run('restored')
                row['status'] = 'killed_and_restored'
                print(case.name + ': intended failure; restored PASS', flush=True)
                persist()
        report['status'] = 'passed'
        print('PASS: ' + str(len(chosen)) + ' intended failures; ' + str(len(chosen)) + ' restored passes; 0 survivors; ' + ('full suite' if not args.case else 'explicit subset') + '; working source untouched.', flush=True)
    except Exception as error:
        report['error'] = str(error)
        raise
    finally:
        persist()
