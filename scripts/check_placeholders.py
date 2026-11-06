"""Reject common credential formats in project-owned files without printing values."""
from pathlib import Path
import re,subprocess
ROOT=Path(__file__).resolve().parents[1]
PATTERNS=[re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),re.compile(rb'\bgh[pousr]_[A-Za-z0-9]{30,}'),re.compile(rb'\bAKIA[A-Z0-9]{16}\b'),re.compile(rb'\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}')]
def main():
 paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0')
 bad=[]
 for name in paths:
  path=ROOT/name
  if not name or not path.is_file() or path.suffix in {'.jar','.png','.zip'} or name=='scripts/check_placeholders.py':continue
  data=path.read_bytes()
  if any(p.search(data) for p in PATTERNS):bad.append(name)
 if bad:raise SystemExit('Potential credential found; inspect these files locally: '+', '.join(bad))
 print('PASS: no common private-key/provider-token formats found in project files; configuration examples remain placeholders.')
if __name__=='__main__':main()
