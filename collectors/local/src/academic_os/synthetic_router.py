"""Loopback synthetic provider. No upstream calls, input logging or real auth."""
import json,threading,urllib.request,urllib.error,uuid
from collections import deque
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

class MockState:
 def __init__(self,scenarios=('valid',)):
  self.scenarios=deque(scenarios);self.calls=0;self.sync_calls=0;self.bytes_received=0;self.tools_observed=False;self.lock=threading.Lock()
 def next(self):
  with self.lock:self.calls+=1;return self.scenarios.popleft() if self.scenarios else 'valid'

def make_mock_server(port=0,scenarios=('valid',),tls_context=None,sync_port=None):
 state=MockState(scenarios)
 if sync_port is not None and not 1<=int(sync_port)<=65535:raise ValueError('INVALID_SYNTHETIC_PORT')
 forward=urllib.request.build_opener(urllib.request.ProxyHandler({}))
 class Handler(BaseHTTPRequestHandler):
  def log_message(self,*_):pass
  def reply(self,status,value):
   raw=json.dumps(value).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
  def proxy(self,raw=None):
   path=urlsplit(self.path).path
   if sync_port is None or path not in ('/api/v1/sync','/api/v1/sync/status'):self.reply(404,{'error':'SYNTHETIC_ONLY'});return
   headers={k:v for k,v in self.headers.items() if k.lower() in ('content-type','x-collector-key-id','x-request-timestamp','x-nonce','x-body-sha256','x-signature')}
   request=urllib.request.Request('http://127.0.0.1:'+str(sync_port)+self.path,data=raw,method=self.command,headers=headers)
   try:
    with forward.open(request,timeout=30) as response:
     value=json.loads(response.read(262145));self.reply(response.status,value)
   except urllib.error.HTTPError as error:
    try:value=json.loads(error.read(262145))
    except Exception:value={'error':'SYNTHETIC_FORWARD_FAILED'}
    self.reply(error.code,value)
   except Exception:self.reply(503,{'error':'SYNTHETIC_FORWARD_FAILED'})
  def do_GET(self):self.proxy()
  def do_POST(self):
   try:
    length=int(self.headers.get('Content-Length','0'))
    if self.headers.get('Transfer-Encoding') or not 0<length<=262144:self.reply(413,{'error':'SYNTHETIC_SIZE'});return
    raw=self.rfile.read(length)
    if len(raw)!=length:self.reply(400,{'error':'SYNTHETIC_INTERRUPTED'});return
    if self.path=='/api/v1/sync':
     with state.lock:state.sync_calls+=1
     self.proxy(raw);return
    if self.path!='/v1/chat/completions':self.reply(404,{'error':'SYNTHETIC_ONLY'});return
    value=json.loads(raw)
    with state.lock:
     state.bytes_received+=len(raw);state.tools_observed=state.tools_observed or 'tools' in value or 'functions' in value
    scenario=state.next()
    if scenario in ('429','500','503'):
     self.reply(int(scenario),{'error':{'code':'SYNTHETIC_'+scenario}});return
    if scenario=='malformed':content='not valid extraction JSON'
    else:
     messages=json.loads(next(m['content'] for m in value['messages'] if m['role']=='user'))
     evidence=messages[0]['id'];uuid.UUID(evidence)
     output=json.loads((Path(__file__).resolve().parents[4]/'examples/ai-extraction.synthetic.json').read_text())
     output['batch_id']=str(uuid.uuid4());output['candidates'][0]['draft_id']='synthetic-router';output['candidates'][0]['evidence_ids']=[evidence]
     output['candidates'][0]['fields']['title']='Synthetic router obligation'
     if scenario=='invalid-schema':output['candidates'][0]['needs_review']=False
     content=json.dumps(output)
    self.reply(200,{'choices':[{'message':{'role':'assistant','content':content}}]})
   except Exception:self.reply(400,{'error':'SYNTHETIC_REQUEST_INVALID'})
 server=ThreadingHTTPServer(('127.0.0.1',port),Handler);server.daemon_threads=True
 if tls_context is not None:server.socket=tls_context.wrap_socket(server.socket,server_side=True)
 return server,state
