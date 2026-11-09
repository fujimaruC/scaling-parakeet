// Owner-local only. Never print a private key or put it under the source tree.
import {generateKeyPairSync} from 'node:crypto';
import {openSync,writeFileSync,fsyncSync,closeSync,realpathSync} from 'node:fs';
import {dirname,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const output=process.argv[2];
if(!output||!isAbsolute(output))throw Error('ABSOLUTE_PRIVATE_PATH_REQUIRED');
const root=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const destination=resolve(realpathSync(dirname(output)),output.split('/').at(-1));
if(destination===root||destination.startsWith(root+'/'))throw Error('SECRET_MUST_STAY_OUTSIDE_REPOSITORY');
const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const fd=openSync(destination,'wx',0o600);
try{writeFileSync(fd,JSON.stringify(privateKey.export({format:'jwk'})));fsyncSync(fd);}finally{closeSync(fd);}
console.log('CREATED_LOCAL_SECRET_FILE (private; do not upload)');
