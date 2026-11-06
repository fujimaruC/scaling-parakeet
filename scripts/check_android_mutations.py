"""Fault injection in an isolated checkout; always restore mutated source files.

Requires configured JDK/SDK. Do not run alongside another Android build.
No device, emulator or Android Keystore execution is performed.
"""
import argparse,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'apps/android-companion/app/src/main/java/id/academicos/companion'

def main():
 p=argparse.ArgumentParser();p.add_argument('--output-dir',required=True);args=p.parse_args()
 output=Path(args.output_dir).resolve();output.mkdir(parents=True,exist_ok=True)
 cases=[
 ('unkeyed-fingerprint','QueuePrivacy.kt','return mac.doFinal(payload.toByteArray(Charsets.UTF_8))','return java.security.MessageDigest.getInstance("SHA-256").digest(payload.toByteArray(Charsets.UTF_8))','testQueuePrivacy','java.lang.IllegalStateException: Check failed.'),
 ('missing-key-regeneration','QueuePrivacy.kt','if (protectedData) throw QueueUnavailable("KEY_MISSING_WIPE_REQUIRED")','// MUTATION: allow regeneration over protected data','testQueuePrivacy','Expected KEY_MISSING_WIPE_REQUIRED'),
 ('legacy-migration-bypass','QueuePrivacy.kt','if (oldVersion < 2) throw QueueUnavailable("LEGACY_QUEUE_WIPE_REQUIRED")','// MUTATION: bypass legacy gate','testQueuePrivacy','Expected LEGACY_QUEUE_WIPE_REQUIRED'),
 ('inherited-autocloseable','Queue.kt','null, 2), AutoCloseable {','null, 2) {','verifyApi28','receiver type mismatch'),
 ('newer-android-method','Queue.kt','private val app = context.applicationContext','private val app = context.applicationContext\n    private fun api30Regression() = app.display','verifyApi28',"unresolved reference 'display'"),
 ('host-jdk-method','Queue.kt','private val app = context.applicationContext','private val app = context.applicationContext\n    private fun newerJavaRegression() = java.nio.file.Files.mismatch(java.nio.file.Paths.get("a"), java.nio.file.Paths.get("b"))','verifyApi28',"unresolved reference 'mismatch'"),
 ]
 def run(name,task):
  with (output/(name+'.log')).open('w') as log:r=subprocess.run(['./gradlew',task,'--console=plain','--no-daemon'],cwd=ROOT/'apps/android-companion',stdout=log,stderr=subprocess.STDOUT)
  print(f'{name}: exit {r.returncode}',flush=True);return r.returncode
 for name,filename,before,after,task,expected in cases:
  path=SOURCE/filename;original=path.read_bytes();text=original.decode()
  if text.count(before)!=1:raise RuntimeError('Mutation anchor not unique: '+name)
  try:
   path.write_text(text.replace(before,after))
   if run(name+'-broken',task)==0:raise RuntimeError('Mutation survived: '+name)
   if expected not in (output/(name+'-broken.log')).read_text():raise RuntimeError('Unexpected failure reason: '+name)
  finally:path.write_bytes(original)
  if run(name+'-restored',task)!=0:raise RuntimeError('Restored implementation failed: '+name)
 print('PASS: 6 mutations failed, 6 restored runs passed; source files restored.',flush=True)
if __name__=='__main__':main()
