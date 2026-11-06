"""Explicit structured-only projection and source-scoped signed upload."""
import base64,hashlib,hmac,json,time,urllib.request,uuid
from datetime import datetime,timezone
from .contracts import validator,validate_extraction
from .core import Invalid

def project(store,source_id,output):
    row=store.db.execute('SELECT generation FROM sources WHERE id=? AND enabled=1',(source_id,)).fetchone()
    if not row:raise Invalid('SOURCE_REVOKED')
    generation=row[0]
    store.allowed(source_id,generation)
    evidence={m['id']:m for m in store.evidence() if m['source_id']==source_id}
    validate_extraction(output,evidence)
    ids={eid for c in output['candidates'] for eid in c['evidence_ids']}
    # Stable IDs derive from private keyed input; persist random UUID mapping in local SQLite.
    store.db.execute('CREATE TABLE IF NOT EXISTS proposal_ids(local_key TEXT PRIMARY KEY,id TEXT NOT NULL)')
    candidates=[]
    for c in output['candidates']:
        local_key=store.fingerprint([source_id,c['evidence_ids'],c['fields']])
        with store.db:store.db.execute('INSERT OR IGNORE INTO proposal_ids VALUES(?,?)',(local_key,str(uuid.uuid4())))
        ident=store.db.execute('SELECT id FROM proposal_ids WHERE local_key=?',(local_key,)).fetchone()[0]
        candidates.append({'candidate_id':ident,'expected_version':None,'fields':c['fields'],'evidence_ids':c['evidence_ids'],'source_decision_state':c['source_decision_state'],'confidence':c['confidence'],'issue_codes':c['issue_codes'],'needs_review':True})
    at=datetime.now(timezone.utc).isoformat()
    value={'schema_version':'2.0','batch_id':str(uuid.uuid4()),'source_id':source_id,'source_generation':generation,'created_at':at,'idempotency_key':str(uuid.uuid4()),'coverage':{'quality':'unknown','start_at':None,'end_at':None,'known_gaps':[]},'items':[{'evidence_id':eid,'observed_at':at,'source_message_at':evidence[eid]['payload'].get('source_message_at') if isinstance(evidence[eid]['payload'].get('source_message_at'),str) else None,'local_evidence_available':True} for eid in sorted(ids)],'candidates':candidates}
    validator('sync-envelope.schema.json').validate(value)
    return value

def upload(value,url,key_id,secret):
    validator('sync-envelope.schema.json').validate(value)
    if not url.startswith('https://') or not url.endswith('/api/v1'):raise Invalid('INVALID_CLOUD_URL')
    raw=json.dumps(value,separators=(',',':'),ensure_ascii=False).encode();stamp=str(int(time.time()));nonce=uuid.uuid4().hex;digest=hashlib.sha256(raw).hexdigest()
    canonical='\n'.join(['POST','/api/v1/sync',stamp,nonce,digest]);signature=base64.urlsafe_b64encode(hmac.new(secret.encode(),canonical.encode(),hashlib.sha256).digest()).decode().rstrip('=')
    request=urllib.request.Request(url+'/sync',data=raw,headers={'Content-Type':'application/json','X-Collector-Key-Id':key_id,'X-Request-Timestamp':stamp,'X-Nonce':nonce,'X-Body-SHA256':digest,'X-Signature':signature})
    with urllib.request.urlopen(request,timeout=30) as response:return json.loads(response.read(262144))

def collector_request(url,key_id,secret,path,method='GET',value=None):
    if not url.startswith('https://') or not url.endswith('/api/v1'):raise Invalid('INVALID_CLOUD_URL')
    raw=b'' if value is None else json.dumps(value,separators=(',',':')).encode();stamp=str(int(time.time()));nonce=uuid.uuid4().hex;digest=hashlib.sha256(raw).hexdigest();canonical='\n'.join([method,path.split('?',1)[0],stamp,nonce,digest]);signature=base64.urlsafe_b64encode(hmac.new(secret.encode(),canonical.encode(),hashlib.sha256).digest()).decode().rstrip('=')
    request=urllib.request.Request(url[:-len('/api/v1')]+path,data=None if method=='GET' else raw,method=method,headers={'Content-Type':'application/json','X-Collector-Key-Id':key_id,'X-Request-Timestamp':stamp,'X-Nonce':nonce,'X-Body-SHA256':digest,'X-Signature':signature})
    with urllib.request.urlopen(request,timeout=30) as response:return json.loads(response.read(262144))['data']
def source_status(source,url,key_id,secret):
    return collector_request(url,key_id,secret,'/api/v1/sync/status?source_id='+source)
def purge_ack(source,generation,url,key_id,secret):
    return collector_request(url,key_id,secret,'/api/v1/sync/purge-ack','POST',{'source_id':source,'generation':generation})
