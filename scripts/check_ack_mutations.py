"""Synthetic fault injection; restore every file in finally. Run in isolation."""
import subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
cases=[('cloud-assumed-success','apps/worker/src/device-actions.ts',"row.applied_at\n      ? 'applied'", "true\n      ? 'applied'",['npm','test']),('local-assumed-applied','collectors/local/src/academic_os/pairing.py',"if phase=='applied':self.store.db.execute", "if True:self.store.db.execute",['.venv/bin/python','-m','unittest','discover','-s','collectors/local/tests','-p','test_control.py']),('evidence-fabricated-pass','scripts/device_evidence.py',"'smoke_result':'unverified'","'smoke_result':'PASS'",['.venv/bin/python','-m','unittest','discover','-s','collectors/local/tests','-p','test_control.py'])]
cases += [
 ('stale-generation','apps/worker/src/device-actions.ts','o.generation !== source.generation','false',['npm','test']),
 ('receipt-without-commit','collectors/local/src/academic_os/pairing.py','  self.receipt(device,batch)','  pass # MUTATION: accept nonexistent receipt',['.venv/bin/python','-m','unittest','discover','-s','collectors/local/tests','-p','test_control.py']),
 ('no-job-purge','collectors/local/src/academic_os/control.py','   store.purge(source)','   pass # MUTATION: omit local purge',['.venv/bin/python','-m','unittest','discover','-s','collectors/local/tests','-p','test_control.py'])]

out=root.parent/'ack-evidence';out.mkdir(exist_ok=True)
for name,file,before,after,command in cases:
 path=root/file;original=path.read_bytes();assert before in original.decode(),name
 try:
  path.write_text(original.decode().replace(before,after))
  with (out/(name+'-broken.log')).open('w') as log:r=subprocess.run(command,cwd=root,stdout=log,stderr=subprocess.STDOUT)
  print(name,'broken exit',r.returncode,flush=True);assert r.returncode!=0,name
 finally:path.write_bytes(original)
 with (out/(name+'-restored.log')).open('w') as log:r=subprocess.run(command,cwd=root,stdout=log,stderr=subprocess.STDOUT)
 print(name,'restored exit',r.returncode,flush=True);assert r.returncode==0,name
