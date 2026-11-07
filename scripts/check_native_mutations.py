#!/usr/bin/env python3
"""Synthetic native/API faults. Never run concurrently with another build.

Each broken run must fail for its intended reason. Finally restores exact bytes,
then the restored implementation must pass. No device/account/runtime claim.
"""
import argparse
import os
from pathlib import Path
import subprocess
import urllib.parse
ROOT=Path(__file__).resolve().parents[1]
K='apps/android-companion/app/src/main/java/id/academicos/companion/'

def main():
 p=argparse.ArgumentParser();p.add_argument('--output-dir',required=True);p.add_argument('--java-home',required=True);p.add_argument('--android-home',required=True);a=p.parse_args()
 out=Path(a.output_dir).resolve();out.mkdir(parents=True,exist_ok=True)
 env=dict(os.environ,JAVA_HOME=a.java_home,ANDROID_HOME=a.android_home);env['PATH']=a.java_home+'/bin:'+env['PATH']
 proxy=urllib.parse.urlparse(env.get('HTTPS_PROXY',''))
 if proxy.hostname:env['JAVA_TOOL_OPTIONS']=env.get('JAVA_TOOL_OPTIONS','')+' '+' '.join('-D'+v+'.proxyHost='+proxy.hostname+' -D'+v+'.proxyPort='+str(proxy.port or 80) for v in ['http','https'])
 gradle=['./gradlew','--console=plain','--no-daemon','-Dorg.gradle.java.home='+a.java_home,'-Dorg.gradle.java.installations.paths='+a.java_home,'-Dorg.gradle.java.installations.auto-detect=false']
 cases=[
 ('native-inherited-autocloseable','verifyApi28',K+'ledger/PrivateStore.kt','null,1),AutoCloseable {','null,1) {','receiver type mismatch'),
 ('native-newer-android','verifyApi28',K+'ledger/Ui.kt','class Ui(val activity:Activity) {','class Ui(val activity:Activity) {\n private fun regression() = activity.display',"unresolved reference 'display'"),
 ('native-host-jdk','verifyApi28',K+'ledger/Ui.kt','class Ui(val activity:Activity) {','class Ui(val activity:Activity) {\n private fun regression() = java.nio.file.Files.mismatch(java.nio.file.Paths.get("a"),java.nio.file.Paths.get("b"))',"unresolved reference 'mismatch'"),
 ('native-precision-collapse','testNativePolicy',K+'ledger/NativePolicy.kt','"unknown","approximate"->require(date==null&&wall==null&&zone==null)','"unknown","approximate"->Unit','Check failed'),
 ('native-undated-done','testNativePolicy',K+'ledger/NativePolicy.kt','if(precision=="unknown"||precision=="approximate")return "undated"','if(precision=="unknown"||precision=="approximate")return if(status=="done")"done"else"undated"','Check failed'),
 ('native-discard-uncertain-request','testNativePolicy',K+'ledger/NativePolicy.kt','status !in 400..499 || status in listOf(408,425,429)','status in 200..299','Check failed'),
 ('native-unavailable-is-empty','testNativePolicy',K+'ledger/NativePolicy.kt','failed->LoadState.UNAVAILABLE','failed->LoadState.EMPTY','Check failed'),
 ('device-pending-authority','worker','apps/worker/src/device-auth.ts',"(!pending && client.status !== 'active')",'false','AssertionError'),
 ('device-scope-bypass','worker','apps/worker/src/device-auth.ts','  return routes.some(','  return true || routes.some(','AssertionError'),
 ('snooze-expired-receipt','worker','apps/worker/src/index.ts',"            scope = 'snooze:' + snooze[1];","            scope = 'snooze:' + snooze[1];\n          if (Date.parse(v.until) <= Date.now()) throw new Http(422, 'INVALID_SNOOZE');",'AssertionError'),
 ]
 def run(name,task):
  cmd=['./node_modules/.bin/vitest','run','tests/integration/native-owner.test.ts'] if task=='worker' else gradle+[task]
  cwd=ROOT if task=='worker' else ROOT/'apps/android-companion';log=out/(name+'.log')
  with log.open('w') as f:r=subprocess.run(cmd,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT)
  print(name+': exit '+str(r.returncode),flush=True);return r.returncode,log.read_text()
 checked=set()
 for name,task,filename,before,after,expected in cases:
  path=ROOT/filename;original=path.read_bytes();text=original.decode()
  if text.count(before)!=1:raise RuntimeError('Mutation anchor not unique: '+name)
  if task not in checked:
   if run(name+'-baseline',task)[0]:raise RuntimeError('Baseline failed: '+name)
   checked.add(task)
  try:
   path.write_text(text.replace(before,after));code,output=run(name+'-broken',task)
   if code==0 or expected not in output:raise RuntimeError('Survived or unexpected failure: '+name)
  finally:path.write_bytes(original)
  if run(name+'-restored',task)[0]:raise RuntimeError('Restored run failed: '+name)
 print(f'PASS: {len(cases)} intended failures; {len(cases)} restored passes. Source restored. No device/account.',flush=True)
if __name__=='__main__':main()
