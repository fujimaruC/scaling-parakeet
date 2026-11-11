"""Owner-only local proof/promotion transaction. Does nothing without explicit CLI invocation."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import subprocess
from gate_promotion import proposed_documents
from mutation_harness import ROOT, private_fixture, run_process

GATE_FAULTS = [prefix + '-' + suffix for prefix in ('gate8', 'gate3') for suffix in ('wrong-proof', 'missing-sentence', 'stale-contradiction')]

def source_fingerprint():
    # Include uncommitted, nonignored code too; a branch name is not a snapshot.
    paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).split(b'\0')
    digest=hashlib.sha256()
    for raw in sorted(set(paths)-{b''}):
        path=ROOT/os.fsdecode(raw)
        digest.update(raw+b'\0')
        if not path.exists():digest.update(b'MISSING\0');continue
        digest.update(str(path.lstat().st_mode).encode()+b'\0')
        digest.update(os.readlink(path).encode() if path.is_symlink() else path.read_bytes())
        digest.update(b'\0')
    return digest.hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    out = args.output_dir.resolve()
    if out == ROOT or ROOT in out.parents:
        parser.error('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY')
    out.mkdir(parents=True, exist_ok=True, mode=0o700)
    if any(out.iterdir()):
        parser.error('OUTPUT_MUST_BE_EMPTY')
    original = {path: (ROOT / path).read_bytes() for path in proposed_documents(ROOT)}
    proposed = proposed_documents(ROOT)
    fingerprint=source_fingerprint()
    report = {'status': 'unverified', 'proofs': {}, 'external_provider': 'unverified', 'production_d1': 'unverified', 'source_commit': None}
    report['source_commit']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    report['source_snapshot_sha256']=fingerprint
    (out/'promotion.json').write_text(json.dumps(report,indent=2)+'\n')
    env = {**os.environ, 'AOS_TEST_PYTHON': sys.executable, 'PYTHONDONTWRITEBYTECODE': '1'}
    # Negative proofs run against promoted claims in isolated fixtures. A missing
    # marker/failed assertion/zero test result aborts before owner documents change.
    command = [sys.executable, 'scripts/check_round6_mutations.py', '--output-dir', str(out / 'guard-faults')]
    for name in GATE_FAULTS:
        command.extend(['--case', name])
    code, output, elapsed = run_process(command, ROOT, out / 'guard-faults.log', 1200, env)
    print(output, end='')
    if code or '6 intended failures; 6 restored passes; 0 survivors' not in output:
        raise SystemExit('PROMOTION_GUARD_PROOF_FAILED: documents unchanged')
    report['proofs']['guard_faults'] = {'exit_code': code, 'elapsed_seconds': elapsed}
    with private_fixture() as work:
        for name, text in proposed.items():
            (work / name).write_text(text)
        code, output, elapsed = run_process([sys.executable, 'scripts/check_gate_claims.py'], work, out / 'named-proofs.log', 300, env)
        print(output, end='')
        if code or not all('PROOF ' + key + ' PASS' in output for key in ('disposable-d1-local', 'synthetic-router-local')):
            raise SystemExit('PROMOTION_NAMED_PROOF_FAILED: documents unchanged')
        report['proofs']['named'] = {'exit_code': code, 'elapsed_seconds': elapsed}
    if source_fingerprint()!=fingerprint or any((ROOT / path).read_bytes() != data for path, data in original.items()):
        raise SystemExit('PROMOTION_DOCUMENT_CHANGED: re-run against current source')
    written = []
    try:
        # Two text files cannot be atomically renamed together. Any partial
        # crash leaves a mismatch rejected by the unchanged guard, never success.
        for name, text in proposed.items():
            temporary = ROOT / name.parent / (name.name + '.promotion.tmp')
            with temporary.open('x') as stream:
                stream.write(text);stream.flush();os.fsync(stream.fileno())
            os.replace(temporary, ROOT / name)
            written.append(name)
        report['status'] = 'locally_verified'
        report['document_sha256'] = {str(p): hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in proposed}
    except BaseException:
        for name in written:
            (ROOT / name).write_bytes(original[name])
        raise
    finally:
        (out / 'promotion.json').write_text(json.dumps(report, indent=2) + '\n')
    print('Local gates promoted after real named proofs and guard faults; external gates remain unverified.')
    print('Review STATUS/11-TEST-STRATEGY diff and attach the private proof logs before committing. No milestone is complete.')

if __name__ == '__main__':
    main()
