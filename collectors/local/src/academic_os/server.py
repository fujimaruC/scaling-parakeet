"""Loopback-only local import UI; raw receiver is a separate TLS/private-bind process."""
import argparse, hashlib, hmac, ipaddress, json, os, secrets, ssl, time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from uuid import uuid4
from .core import Store, Invalid
from .pipeline import Pipeline
from .pairing import Pairing
from . import operations
from urllib.parse import parse_qs,urlsplit

PAGE = """<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Academic OS · Linux</title><style>body{font:16px system-ui;max-width:720px;margin:40px auto;padding:20px;background:#f7f8f2;color:#203b34}input,button,textarea{font:inherit;display:block;padding:12px;margin:12px 0;box-sizing:border-box;width:100%}pre{white-space:pre-wrap}button{background:#176b58;color:white;border:0;border-radius:8px}</style><h1>Academic OS · Linux</h1><p>Raw imports stay on this Linux machine. AI requires explicit source/provider consent. Keep real credentials on your own computer.</p><form id=login><label>Local setup token<input id=token type=password required></label><button>Unlock</button></form><section id=workspace hidden><p><a href="/operations">Manage all sources and durable job states</a></p><h2>Selected source</h2><label>Source UUID<input id=source required></label><button id=enroll>Enroll source locally</button><h2>Pair capture device</h2><button id=invite>Create 5-minute pairing invitation</button><p>Enter the token on your own Android with the private HTTPS receiver address and its certificate fingerprint. No account key is needed.</p><h2>Import export</h2><label>WhatsApp text export<input id=file type=file accept='.txt,text/plain'></label><button id=preview>Preview and import locally</button><h2>Local evidence</h2><button id=load>Read local evidence</button><div id=selection></div><h2>Extraction and cloud proposals</h2><button id=config>Show configured provider (no keys)</button><button id=redact>Preview selected redacted messages</button><p><a href="/operations">Enable or revoke AI consent per source in Local operations</a></p><button id=extract>Extract proposals from selected messages</button><p>Review the structured projection below. Queuing it only sends proposals; each task still needs approval in the PWA.</p><label>Job ID<input id=job></label><button id=queue>Confirm projection & queue proposals</button><button id=send>Sync queued proposals</button><button id=jobs>Show jobs and retry status</button><pre id=output></pre></section><script>
async function call(path,value){const r=await fetch(path,{method:value===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:value===undefined?undefined:JSON.stringify(value)});const v=await r.json();if(!r.ok)throw Error(v.error);return v}
function show(value){document.querySelector('#output').textContent=JSON.stringify(value,null,2)}
function attempt(fn){return async e=>{e.preventDefault();try{show(await fn())}catch(err){show({error:err.message})}}}
document.querySelector('#login').onsubmit=async e=>{e.preventDefault();const r=await fetch('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:document.querySelector('#token').value})});if(r.ok){document.querySelector('#login').hidden=true;document.querySelector('#workspace').hidden=false}else alert('Access denied')};
document.querySelector('#enroll').onclick=attempt(()=>call('/sources',{source_id:document.querySelector('#source').value}));
document.querySelector('#preview').onclick=attempt(async()=>{const file=document.querySelector('#file').files[0];if(!file)throw Error('Select a text export');if(file.size>25*1024*1024)throw Error('Export too large');if(!confirm('Process this selected conversation locally? Verify the source UUID first.'))return {};return call('/imports',{source_id:document.querySelector('#source').value,text:await file.text()})});
document.querySelector('#load').onclick=attempt(async()=>{const records=await call('/evidence');const selection=document.querySelector('#selection');selection.replaceChildren();for(const m of records.filter(m=>m.source_id===document.querySelector('#source').value)){const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.value=m.id;check.className='evidence-choice';label.append(check,document.createTextNode(m.payload.text));selection.append(label)}return {available:records.length}});
document.querySelector('#invite').onclick=attempt(()=>call('/pairing/invite',{source_id:document.querySelector('#source').value}));
const source=()=>document.querySelector('#source').value;const ids=()=>Array.from(document.querySelectorAll('.evidence-choice:checked')).map(x=>x.value);
document.querySelector('#config').onclick=attempt(()=>call('/processing/config'));
document.querySelector('#redact').onclick=attempt(()=>call('/processing/preview',{source_id:source(),evidence_ids:ids()}));
document.querySelector('#extract').onclick=attempt(async()=>{const job=await call('/processing/extract',{source_id:source(),evidence_ids:ids()});document.querySelector('#job').value=job.id;return job});
document.querySelector('#queue').onclick=attempt(()=>{if(!confirm('I reviewed the structured projection and want to sync these unapproved proposals.'))return {};return call('/jobs/'+document.querySelector('#job').value+'/queue',{approved:true})});
document.querySelector('#send').onclick=attempt(()=>call('/jobs/'+document.querySelector('#job').value+'/send',{}));
document.querySelector('#jobs').onclick=attempt(()=>call('/jobs'));
</script></html>"""

def make_handler(store,token,origin,receiver=False):
    sessions=set()
    pipeline=Pipeline(store)
    pairing=Pairing(store)
    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup();self.connection.settimeout(60)

        def log_message(self,*args): pass
        def reply(self,status,payload,headers=None):
            data=payload.encode() if isinstance(payload,str) else json.dumps(payload).encode()
            self.send_response(status);self.send_header('Content-Type','text/html; charset=utf-8' if isinstance(payload,str) else 'application/json')
            self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer');self.send_header('X-Frame-Options','DENY')
            for k,v in (headers or {}).items():self.send_header(k,v)
            self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        def read_body(self,limit):
            if self.headers.get('Transfer-Encoding'):raise Invalid('UNSUPPORTED_ENCODING')
            try:size=int(self.headers.get('Content-Length','0'))
            except ValueError:raise Invalid('INVALID_SIZE')
            if size<0 or size>limit:raise Invalid('OVERSIZE')
            raw=self.rfile.read(size)
            if len(raw)!=size:raise Invalid('INTERRUPTED_BODY')
            return raw,json.loads(raw)
        def authorized(self):
            cookie=self.headers.get('Cookie','');return any(hmac.compare_digest(cookie,'session='+s) for s in sessions)
        def device_auth(self,raw,allow_revoked=False):
            device=self.headers.get('X-Device-Id','');stamp=self.headers.get('X-Request-Timestamp','');nonce=self.headers.get('X-Nonce','')
            row=store.db.execute('SELECT secret FROM devices WHERE id=?'+('' if allow_revoked else ' AND revoked=0'),(device,)).fetchone()
            if not row or not stamp.isdigit() or abs(time.time()-int(stamp))>300 or not 16<=len(nonce)<=128:raise Invalid('ACCESS_DENIED')
            secret=store.cipher.decrypt(row[0]);digest=hashlib.sha256(raw).hexdigest();canonical='\n'.join([self.command,self.path,stamp,nonce,digest])
            import base64
            signature=base64.urlsafe_b64encode(hmac.new(secret,canonical.encode(),hashlib.sha256).digest()).decode().rstrip('=')
            if not hmac.compare_digest(signature,self.headers.get('X-Signature','')):raise Invalid('ACCESS_DENIED')
            with store.db:store.db.execute('INSERT INTO nonces VALUES(?,?,?)',(device,nonce,int(stamp)))
            return device
        def do_GET(self):
            if receiver:
                try:
                    if self.path=='/local/v1/device-status':device=self.device_auth(b'',True);self.reply(200,pairing.status(device));return
                    if self.path.startswith('/local/v1/receipts/'):device=self.device_auth(b'');self.reply(200,pairing.receipt(device,self.path.split('/')[-1]));return
                    self.reply(404,{'error':'NOT_FOUND'});return
                except Exception:self.reply(403,{'error':'ACCESS_DENIED'});return
            if self.headers.get('Host')!=origin.split('://',1)[1]:self.reply(403,{'error':'INVALID_HOST'});return
            if self.path=='/':self.reply(200,PAGE);return
            if not self.authorized():self.reply(401,{'error':'AUTH_REQUIRED'});return
            if urlsplit(self.path).path=='/operations':
                try:
                    query=parse_qs(urlsplit(self.path).query)
                    before=int(query['before'][0]) if 'before' in query else None
                    self.reply(200,operations.page(pipeline,before=before))
                except (ValueError,Invalid):self.reply(422,{'error':'INVALID_JOB_CURSOR'})
                return
            if self.path=='/sources':self.reply(200,operations.sources(pipeline));return
            if self.path=='/evidence':self.reply(200,store.evidence());return
            if self.path=='/processing/config':self.reply(200,pipeline.public_config());return
            if self.path=='/jobs':self.reply(200,pipeline.jobs());return
            if self.path.startswith('/jobs/'):
                try:self.reply(200,pipeline.get(self.path.split('/')[-1]))
                except Invalid:self.reply(404,{'error':'JOB_NOT_FOUND'})
                return
            self.reply(404,{'error':'NOT_FOUND'})
        def do_POST(self):
            try:
                if not receiver and (self.headers.get('Origin')!=origin or self.headers.get('Host')!=origin.split('://',1)[1]):raise Invalid('INVALID_ORIGIN')
                if not receiver and self.path in ('/operations/action','/operations/job-action'):
                    if not self.authorized():self.reply(401,{'error':'AUTH_REQUIRED'});return
                    if self.headers.get('Transfer-Encoding'):raise Invalid('UNSUPPORTED_ENCODING')
                    length=int(self.headers.get('Content-Length','0'))
                    if not 0<length<=8192:raise Invalid('INVALID_SIZE')
                    raw=self.rfile.read(length)
                    if len(raw)!=length:raise Invalid('INTERRUPTED_BODY')
                    fields=parse_qs(raw.decode(),keep_blank_values=True,strict_parsing=True)
                    if any(len(v)!=1 for v in fields.values()):raise Invalid('INVALID_REQUEST')
                    try:
                        handler=operations.job_action if self.path=='/operations/job-action' else operations.action
                        handler(pipeline,{k:v[0] for k,v in fields.items()})
                        self.reply(303,'',{'Location':'/operations'})
                    except Invalid as error:self.reply(422,operations.page(pipeline,str(error)))
                    return
                raw,value=self.read_body(262144 if receiver else 26*1024*1024)
                if receiver:
                    if self.path=='/local/v1/pair':self.reply(200,pairing.accept(value.get('token'),value.get('device_id')));return
                    if self.path=='/local/v1/receipt-applied':device=self.device_auth(raw,True);self.reply(200,pairing.acknowledge_receipt(device,value.get('batch_id'),value.get('phase')));return
                    if self.path=='/local/v1/purge-ack':device=self.device_auth(raw,True);self.reply(200,pairing.acknowledge_purge(device,value.get('generation'),value.get('phase','delivered')));return
                    if self.path!='/local/v1/notification-batches':self.reply(404,{'error':'NOT_FOUND'});return
                    device=self.device_auth(raw);self.reply(200,store.receive(device,value));return
                if self.path=='/login':
                    if not hmac.compare_digest(value.get('token',''),token):raise Invalid('ACCESS_DENIED')
                    session=secrets.token_urlsafe(32);sessions.add(session);self.reply(200,{'unlocked':True},{'Set-Cookie':'session='+session+'; HttpOnly; SameSite=Strict; Path=/'});return
                if not self.authorized():self.reply(401,{'error':'AUTH_REQUIRED'});return
                if self.path=='/sources':store.enroll(value['source_id']);self.reply(201,{'enrolled':True});return
                if self.path=='/imports':self.reply(200,store.import_text(value['source_id'],value['text']));return
                if self.path=='/pairing/invite':self.reply(200,pairing.invite(value['source_id']));return
                if self.path=='/processing/preview':self.reply(200,pipeline.preview(value['source_id'],value['evidence_ids']));return
                if self.path=='/processing/consent':self.reply(200,operations.action(pipeline,{**value,'action':'consent' if value.get('approved') is True else 'revoke'}));return
                if self.path=='/processing/extract':self.reply(200,pipeline.run(value['source_id'],value['evidence_ids']));return
                if self.path.startswith('/jobs/'):
                    parts=self.path.split('/')
                    if len(parts)==4 and parts[3]=='queue':self.reply(200,pipeline.queue(parts[2],value.get('approved')));return
                    if len(parts)==4 and parts[3]=='send':self.reply(200,pipeline.send(parts[2]));return
                self.reply(404,{'error':'NOT_FOUND'})
            except Invalid as error:self.reply(422,{'error':str(error)})
            except (ValueError,KeyError):self.reply(422,{'error':'INVALID_REQUEST'})
            except Exception:self.reply(503,{'error':'LOCAL_STORAGE_UNAVAILABLE'})
    return Handler

def main():
    p=argparse.ArgumentParser();p.add_argument('--data-dir',required=True);p.add_argument('--bind',default='127.0.0.1');p.add_argument('--port',type=int,default=8765);p.add_argument('--receiver',action='store_true');p.add_argument('--tls-cert');p.add_argument('--tls-key');args=p.parse_args()
    address=ipaddress.ip_address(args.bind)
    if not args.receiver and not address.is_loopback:p.error('Local browser UI binds loopback only')
    if args.receiver and (not (address.is_private or address in ipaddress.ip_network('100.64.0.0/10')) or not args.tls_cert or not args.tls_key):p.error('Receiver requires private address and TLS certificate/key')
    directory=Path(args.data_dir).expanduser().resolve()
    if Path.cwd().resolve() in directory.parents:p.error('Store private data outside the repository')
    store=Store(directory);token=os.environ.get('ACADEMIC_OS_LOCAL_TOKEN')
    if not token or len(token)<32:p.error('Set ACADEMIC_OS_LOCAL_TOKEN to a random local secret of at least 32 characters')
    origin='http://'+args.bind+':'+str(args.port);server=HTTPServer((args.bind,args.port),make_handler(store,token,origin,args.receiver));server.timeout=15
    if args.receiver:
        ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);ctx.minimum_version=ssl.TLSVersion.TLSv1_2;ctx.load_cert_chain(args.tls_cert,args.tls_key);server.socket=ctx.wrap_socket(server.socket,server_side=True)
    print('Academic OS local service started. No raw request logging. AI requires configured provider and explicit per-source consent.')
    try:server.serve_forever()
    finally:server.server_close();store.db.close()
if __name__=='__main__':main()
