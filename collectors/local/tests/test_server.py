import json,secrets,tempfile,threading,unittest,urllib.request,urllib.error,uuid,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.core import Store
from academic_os.server import make_handler
from http.server import HTTPServer
class LocalBrowserFlow(unittest.TestCase):
 def test_loopback_login_and_import_while_cross_origin_is_rejected(self):
  with tempfile.TemporaryDirectory() as temp:
   store=Store(temp);token=secrets.token_urlsafe(32)
   server=HTTPServer(('127.0.0.1',0),lambda *a:None)
   origin='http://127.0.0.1:'+str(server.server_port)
   server.RequestHandlerClass=make_handler(store,token,origin)
   thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
   def post(path,value,cookie=None,request_origin=origin):
    headers={'Content-Type':'application/json','Origin':request_origin}
    if cookie:headers['Cookie']=cookie
    req=urllib.request.Request(origin+path,data=json.dumps(value).encode(),headers=headers)
    return urllib.request.urlopen(req,timeout=5)
   try:
    with self.assertRaises(urllib.error.HTTPError):post('/sources',{'source_id':str(uuid.uuid4())},request_origin='https://evil.test')
    with post('/login',{'token':token}) as response:cookie=response.headers['Set-Cookie'].split(';')[0]
    source=str(uuid.uuid4())
    with post('/sources',{'source_id':source},cookie) as response:self.assertEqual(response.status,201)
    with post('/imports',{'source_id':source,'text':'05/11/26, 19.00 - A: Synthetic duty'},cookie) as response:self.assertEqual(json.load(response)['inserted'],1)
   finally:server.shutdown();server.server_close();thread.join();store.db.close()
