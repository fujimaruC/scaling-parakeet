"""Durable local jobs: approved input -> validated proposals -> reviewed projection -> sync."""
import json,os,uuid
from datetime import datetime,timezone
from .ai import extract,redact
from .sync import project,upload,source_status,purge_ack
from .contracts import validator,validate_extraction
from .core import Invalid

PLACEHOLDERS={'','UNCONFIGURED','configure_locally','your-model-route','replace_locally','DUMMY_NOT_A_REAL_SECRET'}
def configured(value):return isinstance(value,str) and value not in PLACEHOLDERS and not value.startswith('YOUR_')
class Pipeline:
    def __init__(self,store,env=None,extractor=extract,uploader=upload,status_checker=source_status,purge_acknowledger=purge_ack):
        self.store=store;self.env=os.environ if env is None else env;self.extractor=extractor;self.uploader=uploader;self.status_checker=status_checker;self.purge_acknowledger=purge_acknowledger
        store.db.executescript('''CREATE TABLE IF NOT EXISTS processing_consent(source_id TEXT PRIMARY KEY,policy BLOB NOT NULL);
        CREATE TABLE IF NOT EXISTS processing_jobs(id TEXT PRIMARY KEY,source_id TEXT NOT NULL,state TEXT NOT NULL,payload BLOB NOT NULL,error_code TEXT,created_at TEXT NOT NULL);''');store.db.commit()
    def config(self):
        return {'route':self.env.get('AI_BASE_URL','UNCONFIGURED'),'model':self.env.get('AI_MODEL','UNCONFIGURED'),'provider':self.env.get('AI_PROVIDER_ID','UNCONFIGURED'),'policy_version':self.env.get('AI_POLICY_VERSION','1')}
    def public_config(self):
        c=self.config();return {**c,'ai_configured':all(configured(c[k]) for k in ['route','model','provider']) and configured(self.env.get('AI_API_KEY','')),'cloud_configured':all(configured(self.env.get(k,'')) for k in ['ACADEMIC_OS_API_URL','COLLECTOR_KEY_ID','COLLECTOR_HMAC_SECRET'])}
    def messages(self,source,ids):
        row=self.store.db.execute('SELECT generation FROM sources WHERE id=? AND enabled=1',(source,)).fetchone()
        if not row:raise Invalid('SOURCE_REVOKED')
        if not isinstance(ids,list) or not ids or len(ids)>100 or len(set(ids))!=len(ids):raise Invalid('INVALID_SELECTION')
        allowed={m['id']:m for m in self.store.evidence() if m['source_id']==source}
        if not set(ids)<=set(allowed):raise Invalid('EVIDENCE_UNAVAILABLE')
        result=[allowed[i] for i in ids]
        if sum(len(m['payload']['text']) for m in result)>9000:raise Invalid('SPLIT_BATCH')
        return result
    def preview(self,source,ids):
        return [{'id':m['id'],'source_message_at':m['payload'].get('source_message_at'),'text':redact(m['payload']['text'])} for m in self.messages(source,ids)]
    def consent(self,source,approved):
        if approved is not True:
            with self.store.db:self.store.db.execute('DELETE FROM processing_consent WHERE source_id=?',(source,))
            return {'enabled':False}
        if not self.public_config()['ai_configured']:raise Invalid('AI_NOT_CONFIGURED')
        self.store.allowed(source,self.store.db.execute('SELECT generation FROM sources WHERE id=?',(source,)).fetchone()[0])
        policy={**self.config(),'mode':'external_selected','approved_at':datetime.now(timezone.utc).isoformat()}
        with self.store.db:self.store.db.execute('INSERT OR REPLACE INTO processing_consent VALUES(?,?)',(source,self.store.cipher.encrypt(json.dumps(policy).encode())))
        return {'enabled':True,**self.config()}
    def policy(self,source):
        row=self.store.db.execute('SELECT policy FROM processing_consent WHERE source_id=?',(source,)).fetchone()
        if not row:raise Invalid('CONSENT_REQUIRED')
        policy=json.loads(self.store.cipher.decrypt(row[0]))
        if any(policy.get(k)!=v for k,v in self.config().items()):raise Invalid('CONSENT_REQUIRED')
        return policy
    def save(self,ident,source,state,payload,error=None):
        data=self.store.cipher.encrypt(json.dumps(payload).encode())
        with self.store.db:self.store.db.execute('INSERT INTO processing_jobs VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,payload=excluded.payload,error_code=excluded.error_code',(ident,source,state,data,error,datetime.now(timezone.utc).isoformat()))
    def get(self,ident):
        row=self.store.db.execute('SELECT id,source_id,state,payload,error_code FROM processing_jobs WHERE id=?',(ident,)).fetchone()
        if not row:raise Invalid('JOB_NOT_FOUND')
        return {'id':row[0],'source_id':row[1],'state':row[2],'payload':json.loads(self.store.cipher.decrypt(row[3])),'error_code':row[4]}
    def jobs(self):
        return [dict(zip(['id','source_id','state','error_code','created_at'],r)) for r in self.store.db.execute('SELECT id,source_id,state,error_code,created_at FROM processing_jobs ORDER BY created_at DESC LIMIT 100')]
    def run(self,source,ids):
        policy=self.policy(source);messages=self.messages(source,ids);ident=str(uuid.uuid4())
        self.save(ident,source,'extracting',{'evidence_ids':ids})
        try:
            output=self.extractor(messages,policy,policy['route'],policy['model'],self.env.get('AI_API_KEY',''),validator('ai-extraction.schema.json'))
            validate_extraction(output,ids)
            envelope=project(self.store,source,output)
            self.save(ident,source,'awaiting_projection_review',{'evidence_ids':ids,'envelope':envelope})
            return self.get(ident)
        except Exception:
            self.save(ident,source,'failed',{'evidence_ids':ids},'EXTRACTION_FAILED')
            raise Invalid('EXTRACTION_FAILED') from None
    def queue(self,ident,approved):
        job=self.get(ident)
        if approved is not True or job['state']!='awaiting_projection_review':raise Invalid('PROJECTION_REVIEW_REQUIRED')
        self.messages(job['source_id'],job['payload']['evidence_ids'])
        self.save(ident,job['source_id'],'sync_pending',job['payload']);return self.get(ident)
    def send(self,ident):
        job=self.get(ident)
        if job['state']=='synced':return {'id':ident,'state':'synced'}
        if job['state']!='sync_pending':raise Invalid('PROJECTION_REVIEW_REQUIRED')
        self.messages(job['source_id'],job['payload']['evidence_ids'])
        if not self.public_config()['cloud_configured']:raise Invalid('CLOUD_NOT_CONFIGURED')
        try:
            status=self.status_checker(job['source_id'],self.env['ACADEMIC_OS_API_URL'],self.env['COLLECTOR_KEY_ID'],self.env['COLLECTOR_HMAC_SECRET'])
        except Exception:raise Invalid('SOURCE_STATUS_UNAVAILABLE') from None
        if status.get('purge_required'):
            self.store.purge(job['source_id'])
            with self.store.db:self.store.db.execute('UPDATE sources SET generation=? WHERE id=?',(status['generation'],job['source_id']))
            try:self.purge_acknowledger(job['source_id'],status['generation'],self.env['ACADEMIC_OS_API_URL'],self.env['COLLECTOR_KEY_ID'],self.env['COLLECTOR_HMAC_SECRET'])
            except Exception:pass
            raise Invalid('SOURCE_REVOKED')
        if status.get('revoked') or status.get('paused') or status.get('generation')!=job['payload']['envelope']['source_generation']:raise Invalid('SOURCE_REVOKED')
        try:
            self.uploader(job['payload']['envelope'],self.env['ACADEMIC_OS_API_URL'],self.env['COLLECTOR_KEY_ID'],self.env['COLLECTOR_HMAC_SECRET'])
        except Exception:
            self.save(ident,job['source_id'],'sync_pending',job['payload'],'SYNC_FAILED');raise Invalid('SYNC_FAILED') from None
        self.save(ident,job['source_id'],'synced',job['payload']);return {'id':ident,'state':'synced'}
