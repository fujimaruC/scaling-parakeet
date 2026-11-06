"""Loopback-only local import UI; raw receiver is a separate TLS/private-bind process."""
import argparse, hashlib, hmac, ipaddress, json, os, secrets, ssl, time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from uuid import uuid4
from .core import Store, Invalid

PAGE = """<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Academic OS · Linux</title><style>body{font:16px system-ui;max-width:720px;margin:40px auto;padding:20px;background:#f7f8f2;color:#203b34}input,button,textarea{font:inherit;display:block;padding:12px;margin:12px 0;box-sizing:border-box;width:100%}pre{white-space:pre-wrap}button{background:#176b58;color:white;border:0;border-radius:8px}</style><h1>Academic OS · Linux</h1><p>Raw imports stay on this Linux machine. AI is disabled here.</p><form id=login><label>Local setup token<input id=token type=password required></label><button>Unlock</button></form><section id=workspace hidden><h2>Selected source</h2><label>Source UUID<input id=source required></label><button id=enroll>Enroll source locally</button><h2>Import export</h2><label>WhatsApp text export<input id=file type=file accept='.txt,text/plain'></label><button id=preview>Preview and import locally</button><h2>Local evidence</h2><button id=load>Read local evidence</button><pre id=output></pre></section><script>
async function call(path,value){const r=await fetch(path,{method:value===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:value===undefined?undefined:JSON.stringify(value)});const v=await r.json();if(!r.ok)throw Error(v.error);return v}
function show(value){document.querySelector('#output').textContent=JSON.stringify(value,null,2)}
function attempt(fn){return async e=>{e.preventDefault();try{show(await fn())}catch(err){show({error:err.message})}}}
document.querySelector('#login').onsubmit=async e=>{e.preventDefault();const r=await fetch('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:document.querySelector('#token').value})});if(r.ok){document.querySelector('#login').hidden=true;document.querySelector('#workspace').hidden=false}else alert('Access denied')};
document.querySelector('#enroll').onclick=attempt(()=>call('/sources',{source_id:document.querySelector('#source').value}));
document.querySelector('#preview').onclick=attempt(async()=>{const file=document.querySelector('#file').files[0];if(!file)throw Error('Select a text export');if(file.size>25*1024*1024)throw Error('Export too large');if(!confirm('Process this selected conversation locally? Verify the source UUID first.'))return {};return call('/imports',{source_id:document.querySelector('#source').value,text:await file.text()})});
document.querySelector('#load').onclick=attempt(()=>call('/evidence'));
</script></html>"""

def make_handler(store,token,origin,receiver=False):
    sessions=set()
    class Handler(BaseHTTPRequestHandler):
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
        def device_auth(self,raw):
            device=self.headers.get('X-Device-Id','');stamp=self.headers.get('X-Request-Timestamp','');nonce=self.headers.get('X-Nonce','')
            row=store.db.execute('SELECT secret FROM devices WHERE id=? AND revoked=0',(device,)).fetchone()
            if not row or not stamp.isdigit() or abs(time.time()-int(stamp))>300 or not 16<=len(nonce)<=128:raise Invalid('ACCESS_DENIED')
            secret=store.cipher.decrypt(row[0]);digest=hashlib.sha256(raw).hexdigest();canonical='\n'.join([self.command,self.path,stamp,nonce,digest])
            import base64
            signature=base64.urlsafe_b64encode(hmac.new(secret,canonical.encode(),hashlib.sha256).digest()).decode().rstrip('=')
            if not hmac.compare_digest(signature,self.headers.get('X-Signature','')):raise Invalid('ACCESS_DENIED')
            with store.db:store.db.execute('INSERT INTO nonces VALUES(?,?,?)',(device,nonce,int(stamp)))
            return device
        def do_GET(self):
            if receiver:self.reply(404,{'error':'NOT_FOUND'});return
            if self.headers.get('Host')!=origin.split('://',1)[1]:self.reply(403,{'error':'INVALID_HOST'});return
            if self.path=='/':self.reply(200,PAGE);return
            if not self.authorized():self.reply(401,{'error':'AUTH_REQUIRED'});return
            if self.path=='/evidence':self.reply(200,store.evidence());return
            self.reply(404,{'error':'NOT_FOUND'})
        def do_POST(self):
            try:
                if not receiver and (self.headers.get('Origin')!=origin or self.headers.get('Host')!=origin.split('://',1)[1]):raise Invalid('INVALID_ORIGIN')
                raw,value=self.read_body(262144 if receiver else 26*1024*1024)
                if receiver:
                    if self.path!='/local/v1/notification-batches':self.reply(404,{'error':'NOT_FOUND'});return
                    device=self.device_auth(raw);self.reply(200,store.receive(device,value));return
                if self.path=='/login':
                    if not hmac.compare_digest(value.get('token',''),token):raise Invalid('ACCESS_DENIED')
                    session=secrets.token_urlsafe(32);sessions.add(session);self.reply(200,{'unlocked':True},{'Set-Cookie':'session='+session+'; HttpOnly; SameSite=Strict; Path=/'});return
                if not self.authorized():self.reply(401,{'error':'AUTH_REQUIRED'});return
                if self.path=='/sources':store.enroll(value['source_id']);self.reply(201,{'enrolled':True});return
                if self.path=='/imports':self.reply(200,store.import_text(value['source_id'],value['text']));return
                self.reply(404,{'error':'NOT_FOUND'})
            except (ValueError,KeyError,Invalid):self.reply(422,{'error':'INVALID_REQUEST'})
            except Exception:self.reply(503,{'error':'LOCAL_STORAGE_UNAVAILABLE'})
    return Handler

def main():
    p=argparse.ArgumentParser();p.add_argument('--data-dir',required=True);p.add_argument('--bind',default='127.0.0.1');p.add_argument('--port',type=int,default=8765);p.add_argument('--receiver',action='store_true');p.add_argument('--tls-cert');p.add_argument('--tls-key');args=p.parse_args()
    address=ipaddress.ip_address(args.bind)
    if not args.receiver and not address.is_loopback:p.error('Local browser UI binds loopback only')
    if args.receiver and (not address.is_private or not args.tls_cert or not args.tls_key):p.error('Receiver requires private address and TLS certificate/key')
    directory=Path(args.data_dir).expanduser().resolve()
    if Path.cwd().resolve() in directory.parents:p.error('Store private data outside the repository')
    store=Store(directory);token=os.environ.get('ACADEMIC_OS_LOCAL_TOKEN')
    if not token or len(token)<32:p.error('Set ACADEMIC_OS_LOCAL_TOKEN to a random local secret of at least 32 characters')
    origin='http://'+args.bind+':'+str(args.port);server=HTTPServer((args.bind,args.port),make_handler(store,token,origin,args.receiver));server.timeout=15
    if args.receiver:
        ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);ctx.minimum_version=ssl.TLSVersion.TLSv1_2;ctx.load_cert_chain(args.tls_cert,args.tls_key);server.socket=ctx.wrap_socket(server.socket,server_side=True)
    print('Academic OS local service started. No raw request logging. AI disabled.')
    try:server.serve_forever()
    finally:server.server_close();store.db.close()
if __name__=='__main__':main()
