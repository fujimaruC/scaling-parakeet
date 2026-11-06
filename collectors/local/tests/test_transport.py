import base64,hashlib,hmac,ipaddress,json,secrets,ssl,tempfile,threading,time,unittest,urllib.request,uuid,sys
from pathlib import Path
from datetime import datetime,timedelta,timezone
from http.server import HTTPServer
from cryptography import x509
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.core import Store
from academic_os.server import make_handler
from academic_os.pairing import Pairing
class TLSTransportTests(unittest.TestCase):
 def test_private_https_pair_signed_receipt_retry_and_revocation(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);key=ec.generate_private_key(ec.SECP256R1());name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'localhost')]);now=datetime.now(timezone.utc)
   cert=x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now-timedelta(minutes=1)).not_valid_after(now+timedelta(hours=1)).add_extension(x509.SubjectAlternativeName([x509.DNSName('localhost'),x509.IPAddress(ipaddress.ip_address('127.0.0.1'))]),critical=False).sign(key,hashes.SHA256())
   cp=root/'test-cert.pem';kp=root/'test-key.pem';cp.write_bytes(cert.public_bytes(serialization.Encoding.PEM));kp.write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
   store=Store(root/'data');source=str(uuid.uuid4());store.enroll(source);pair=Pairing(store);invite=pair.invite(source)
   server=HTTPServer(('127.0.0.1',0),make_handler(store,secrets.token_urlsafe(32),'unused',True));tls=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);tls.load_cert_chain(cp,kp);server.socket=tls.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();url='https://127.0.0.1:'+str(server.server_port);client=ssl.create_default_context(cafile=str(cp))
   def request(path,value=None,secret=None,device=None):
    method='GET' if value is None else 'POST';raw=b'' if value is None else json.dumps(value,separators=(',',':')).encode();headers={'Content-Type':'application/json'}
    if secret:
     stamp=str(int(time.time()));nonce=uuid.uuid4().hex;digest=hashlib.sha256(raw).hexdigest();signature=base64.urlsafe_b64encode(hmac.new(secret.encode(),'\n'.join([method,path,stamp,nonce,digest]).encode(),hashlib.sha256).digest()).decode().rstrip('=');headers.update({'X-Device-Id':device,'X-Request-Timestamp':stamp,'X-Nonce':nonce,'X-Signature':signature})
    with urllib.request.urlopen(urllib.request.Request(url+path,data=None if value is None else raw,method=method,headers=headers),context=client,timeout=5) as response:return json.load(response)
   try:
    device=str(uuid.uuid4());paired=request('/local/v1/pair',{'device_id':device,'token':invite['token']});secret=paired['secret']
    event={'event_id':str(uuid.uuid4()),'captured_at':now.isoformat(),'source_message_at':None,'text':'TLS_RAW_PRIVATE_SENTINEL'};batch={'protocol':1,'device_id':device,'batch_id':str(uuid.uuid4()),'source_id':source,'source_generation':1,'events':[event]}
    first=request('/local/v1/notification-batches',batch,secret,device);again=request('/local/v1/notification-batches',batch,secret,device);self.assertEqual(first,again);self.assertEqual(request('/local/v1/receipts/'+batch['batch_id'],secret=secret,device=device)['state'],'committed');self.assertEqual(len(store.evidence()),1)
    self.assertNotIn(b'TLS_RAW_PRIVATE_SENTINEL',store.db.execute('SELECT payload FROM evidence').fetchone()[0]);store.purge(source);self.assertTrue(request('/local/v1/device-status',secret=secret,device=device)['revoked']);self.assertTrue(request('/local/v1/purge-ack',{'generation':2},secret,device)['acknowledged'])
   finally:server.shutdown();server.server_close();thread.join();store.db.close()
