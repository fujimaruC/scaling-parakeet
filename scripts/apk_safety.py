"""Owner-local APK inspection. No keys/passwords and no app-data reads or resets."""
import os,re,subprocess,tempfile
from pathlib import Path
import device_evidence as d
EPHEMERAL_CERT='3b761748804cc037f8d22e7cafc46c47b163566b1a16d9c4be722045ba6e3838'

def tool(path,*args):
 try:
  r=subprocess.run([str(path),*map(str,args)],capture_output=True,text=True,errors='replace',timeout=30)
  return r.returncode,r.stdout
 except (OSError,subprocess.TimeoutExpired):return None,''

def certificate(apk,signer):
 code,text=tool(signer,'verify','--print-certs',apk)
 rows=re.findall(r'^Signer #\d+ certificate SHA-256 digest: ([0-9a-fA-F:]+)\s*$',text,re.M)
 if code!=0 or len(rows)!=1:return None
 digest=rows[0].replace(':','').lower()
 return digest if re.fullmatch('[0-9a-f]{64}',digest) else None

def check_update(apk,sdk=None):
 result={'allowed':None,'package_present':None,'candidate_package_ok':None,'signature_match':None,'candidate_ephemeral':None,'error_code':None}
 sdk=Path(sdk or os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT') or '/nonexistent')
 signer=sdk/'build-tools/35.0.0/apksigner';aapt=sdk/'build-tools/35.0.0/aapt'
 if not signer.is_file() or not aapt.is_file():result['error_code']='SDK_INSPECTION_TOOLS_UNAVAILABLE';return result
 code,text=tool(aapt,'dump','badging',apk)
 rows=[x for x in text.splitlines() if x.startswith('package:')]
 match=re.match(r"package: name='([^']+)' versionCode='(\d+)'",rows[0]) if len(rows)==1 else None
 if code!=0 or not match:result['error_code']='APK_PACKAGE_UNVERIFIED';return result
 result['candidate_package_ok']=match[1]==d.PKG
 if not result['candidate_package_ok']:result.update(allowed=False,error_code='WRONG_APK_PACKAGE');return result
 cert=certificate(apk,signer)
 if not cert:result['error_code']='APK_SIGNATURE_UNVERIFIED';return result
 result['candidate_ephemeral']=cert==EPHEMERAL_CERT
 code,text=d.command('shell','pm','list','packages','-u',d.PKG)
 rows=text.strip().splitlines()
 # -u also detects retained package/data records. Unknown output must not mean absent.
 if code!=0 or any(x!='package:'+d.PKG for x in rows) or len(rows)>1:result['error_code']='PACKAGE_STATE_UNVERIFIED';return result
 result['package_present']=bool(rows)
 code,text=d.command('shell','pm','path',d.PKG)
 if not rows:
  if code not in (0,1) or text.strip():result['error_code']='PACKAGE_STATE_UNVERIFIED';return result
  result.update(allowed=True,error_code=None);return result
 if code!=0:result['error_code']='INSTALLED_PATH_UNVERIFIED';return result
 paths=text.strip().splitlines()
 if len(paths)!=1 or not re.fullmatch(r'package:/data/app/[A-Za-z0-9_./=+~-]+\.apk',paths[0]):
  result['error_code']='INSTALLED_OR_RETAINED_DATA_UNVERIFIED';return result
 with tempfile.TemporaryDirectory() as temp:
  local=Path(temp)/'installed.apk';code,_=d.command('pull',paths[0][8:],str(local))
  prior=certificate(local,signer) if code==0 and local.is_file() else None
 if not prior:result['error_code']='INSTALLED_SIGNATURE_UNVERIFIED';return result
 result['signature_match']=cert==prior;result['allowed']=cert==prior
 if not result['allowed']:result['error_code']='SIGNATURE_MISMATCH'
 return result
