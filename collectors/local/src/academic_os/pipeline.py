"""Durable local jobs: approved input -> validated proposals -> reviewed projection -> sync."""
import json,os,uuid
from datetime import datetime,timezone
from .ai import extract,redact
from .sync import project,upload,source_status,purge_ack
from .contracts import validator,validate_extraction
from .core import Invalid
from .jobs import Attempts,serialized,disposition

PLACEHOLDERS={'','UNCONFIGURED','configure_locally','your-model-route','replace_locally','DUMMY_NOT_A_REAL_SECRET'}
def configured(value):return isinstance(value,str) and value not in PLACEHOLDERS and not value.startswith('YOUR_')
class Pipeline:
    def __init__(self,store,env=None,extractor=extract,uploader=upload,status_checker=source_status,purge_acknowledger=purge_ack,clock=None):
        self.store=store;self.env=os.environ if env is None else env;self.extractor=extractor;self.uploader=uploader;self.status_checker=status_checker;self.purge_acknowledger=purge_acknowledger
        store.db.executescript('''CREATE TABLE IF NOT EXISTS processing_consent(source_id TEXT PRIMARY KEY,policy BLOB NOT NULL);
        CREATE TABLE IF NOT EXISTS processing_jobs(id TEXT PRIMARY KEY,source_id TEXT NOT NULL,state TEXT NOT NULL,payload BLOB NOT NULL,error_code TEXT,created_at TEXT NOT NULL);''');store.db.commit()
        self.attempts=Attempts(store,**({'clock':clock} if clock else {}))
    def config(self):
        return {'route':self.env.get('AI_BASE_URL','UNCONFIGURED'),'model':self.env.get('AI_MODEL','UNCONFIGURED'),'provider':self.env.get('AI_PROVIDER_ID','UNCONFIGURED'),'policy_version':self.env.get('AI_POLICY_VERSION','1')}
    def public_config(self):
        c=self.config();return {**c,'ai_configured':all(configured(c[k]) for k in ['route','model','provider']) and configured(self.env.get('AI_API_KEY','')),'cloud_configured':all(configured(self.env.get(k,'')) for k in ['ACADEMIC_OS_API_URL','COLLECTOR_KEY_ID','COLLECTOR_HMAC_SECRET','COLLECTOR_SOURCE_ID'])}
    def messages(self,source,ids):
        row=self.store.db.execute('SELECT generation FROM sources WHERE id=? AND enabled=1',(source,)).fetchone()
        if not row:raise Invalid('SOURCE_REVOKED')
        self.store.allowed(source,row[0])
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
        policy={**self.config(),'generation':self.store.db.execute('SELECT generation FROM sources WHERE id=?',(source,)).fetchone()[0],'mode':'external_selected','approved_at':datetime.now(timezone.utc).isoformat()}
        with self.store.db:self.store.db.execute('INSERT OR REPLACE INTO processing_consent VALUES(?,?)',(source,self.store.cipher.encrypt(json.dumps(policy).encode())))
        return {'enabled':True,**self.config()}
    def policy(self,source):
        row=self.store.db.execute('SELECT policy FROM processing_consent WHERE source_id=?',(source,)).fetchone()
        if not row:raise Invalid('CONSENT_REQUIRED')
        policy=json.loads(self.store.cipher.decrypt(row[0]))
        if any(policy.get(k)!=v for k,v in self.config().items()) or policy.get('generation') != self.store.db.execute('SELECT generation FROM sources WHERE id=?',(source,)).fetchone()[0]:raise Invalid('CONSENT_REQUIRED')
        return policy
    def save(self,ident,source,state,payload,error=None,create=False):
        data=self.store.cipher.encrypt(json.dumps(payload).encode())
        with self.store.db:
            if create:
                self.store.db.execute('INSERT INTO processing_jobs VALUES(?,?,?,?,?,?)',(ident,source,state,data,error,datetime.now(timezone.utc).isoformat()))
            elif self.store.db.execute('UPDATE processing_jobs SET state=?,payload=?,error_code=? WHERE id=? AND source_id=?',(state,data,error,ident,source)).rowcount!=1:
                raise Invalid('JOB_NOT_FOUND')
    def get(self,ident):
        row=self.store.db.execute('SELECT id,source_id,state,payload,error_code FROM processing_jobs WHERE id=?',(ident,)).fetchone()
        if not row:raise Invalid('JOB_NOT_FOUND')
        return {'id':row[0],'source_id':row[1],'state':row[2],'payload':json.loads(self.store.cipher.decrypt(row[3])),'error_code':row[4],'retry':self.attempts.view(ident),'attempt_history':self.attempts.history(ident)}
    def jobs(self,before=None):
        if before is not None and (not isinstance(before,int) or before<1):raise Invalid('INVALID_JOB_CURSOR')
        rows=self.store.db.execute('SELECT rowid,id,source_id,state,error_code,created_at FROM processing_jobs'+(' WHERE rowid<?' if before is not None else '')+' ORDER BY rowid DESC LIMIT 100',() if before is None else (before,))
        return [{**dict(zip(['cursor','id','source_id','state','error_code','created_at'],r)),'retry':self.attempts.view(r[1])} for r in rows]
    @serialized
    def run(self,source,ids):
        policy=self.policy(source);self.messages(source,ids);ident=str(uuid.uuid4())
        self.save(ident,source,'extracting',{'evidence_ids':ids,'policy':policy},create=True)
        self.attempts.prepare(ident,'extract')
        return self._extract_job(ident)
    def _extract_job(self,ident):
        job=self.get(ident);source=job['source_id'];payload=job['payload'];ids=payload['evidence_ids']
        self.attempts.begin(ident,'extract')
        try:
            policy=self.policy(source)
            if policy!=payload.get('policy'):raise Invalid('CONSENT_REQUIRED')
            messages=self.messages(source,ids)
            output=self.extractor(messages,policy,policy['route'],policy['model'],self.env.get('AI_API_KEY',''),validator('ai-extraction.schema.json'))
            if self.policy(source)!=policy:raise Invalid('CONSENT_REQUIRED')
            self.messages(source,ids)
            validate_extraction(output,ids)
            envelope=project(self.store,source,output)
            self.save(ident,source,'awaiting_projection_review',{'evidence_ids':ids,'envelope':envelope})
            self.attempts.finish(ident,'complete')
            return self.get(ident)
        except Exception as error:
            self.attempts.finish(ident,disposition(error),'EXTRACTION_FAILED')
            # Do not resurrect a concurrently purged job.
            if self.store.db.execute('SELECT 1 FROM processing_jobs WHERE id=?',(ident,)).fetchone():
                self.save(ident,source,'failed',payload,'EXTRACTION_FAILED')
            raise Invalid('EXTRACTION_FAILED') from None
    @serialized
    def queue(self,ident,approved):
        job=self.get(ident)
        if approved is not True or job['state']!='awaiting_projection_review':raise Invalid('PROJECTION_REVIEW_REQUIRED')
        self.messages(job['source_id'],job['payload']['evidence_ids'])
        self.save(ident,job['source_id'],'sync_pending',job['payload']);self.attempts.prepare(ident,'sync');return self.get(ident)
    @serialized
    def send(self,ident):
        return self._send_job(ident,manual=True)
    @serialized
    def send_legacy(self,ident,source,generation):
        return self._send_job(ident,manual=True,selection=(source,generation),legacy_only=True)
    def _send_job(self,ident,manual=False,selection=None,legacy_only=False):
        job=self.get(ident)
        legacy=self.attempts.view(ident)['state']=='legacy_manual_only'
        if legacy_only and not legacy:raise Invalid('LEGACY_MANUAL_REQUIRED')
        if legacy:
            if not manual:raise Invalid('JOB_REVIEW_REQUIRED')
            if selection is None:raise Invalid('EXPLICIT_SOURCE_GENERATION_REQUIRED')
            source,generation=selection
            # Claim commits before any request. No transaction spans the network.
            with self.store.db:
                self.store.db.execute('BEGIN IMMEDIATE')
                if source!=job['source_id']:raise Invalid('JOB_SOURCE_MISMATCH')
                row=self.store.db.execute('SELECT generation FROM sources WHERE id=?',(source,)).fetchone()
                if not row or row[0]!=generation or job['payload'].get('envelope',{}).get('source_generation')!=generation:raise Invalid('SOURCE_GENERATION_CHANGED')
                if self.attempts.view(ident).get('manual_attempted'):raise Invalid('LEGACY_MANUAL_ALREADY_ATTEMPTED')
                if job['state']!='sync_pending':raise Invalid('PROJECTION_REVIEW_REQUIRED')
                if self.env.get('COLLECTOR_SOURCE_ID')!=source:raise Invalid('SOURCE_CREDENTIAL_REQUIRED')
                if not self.public_config()['cloud_configured']:raise Invalid('CLOUD_NOT_CONFIGURED')
                self.messages(source,job['payload']['evidence_ids'])
                self.attempts.begin_legacy(ident)
        else:
            if job['state']=='synced':return {'id':ident,'state':'synced'}
            if job['state']!='sync_pending':raise Invalid('PROJECTION_REVIEW_REQUIRED')
            self.attempts.begin(ident,'sync',manual=manual)
        if self.env.get('COLLECTOR_SOURCE_ID')!=job['source_id']:
            self.attempts.finish(ident,'failed','SOURCE_CREDENTIAL_REQUIRED');raise Invalid('SOURCE_CREDENTIAL_REQUIRED')
        try:self.messages(job['source_id'],job['payload']['evidence_ids'])
        except Invalid:
            self.attempts.finish(ident,'failed','EVIDENCE_UNAVAILABLE');raise
        if not self.public_config()['cloud_configured']:
            self.attempts.finish(ident,'failed','CLOUD_NOT_CONFIGURED');raise Invalid('CLOUD_NOT_CONFIGURED')
        try:
            status=self.status_checker(job['source_id'],self.env['ACADEMIC_OS_API_URL'],self.env['COLLECTOR_KEY_ID'],self.env['COLLECTOR_HMAC_SECRET'])
        except Exception:
            self.attempts.finish(ident,'retry','SOURCE_STATUS_UNAVAILABLE');raise Invalid('SOURCE_STATUS_UNAVAILABLE') from None
        self.store.observe_source(job['source_id'],status)
        if status.get('purge_required'):
            self.store.purge(job['source_id'])
            with self.store.db:self.store.db.execute('UPDATE sources SET generation=? WHERE id=?',(status['generation'],job['source_id']))
            try:
                ack=self.purge_acknowledger(job['source_id'],status['generation'],self.env['ACADEMIC_OS_API_URL'],self.env['COLLECTOR_KEY_ID'],self.env['COLLECTOR_HMAC_SECRET'])
                if isinstance(ack,dict) and ack.get('acknowledged') is True:self.store.mark_purge_ack(job['source_id'],status['generation'])
            except Exception:pass
            raise Invalid('SOURCE_REVOKED')
        if status.get('revoked') or status.get('paused') or status.get('generation')!=job['payload']['envelope']['source_generation']:
            self.attempts.finish(ident,'failed','SOURCE_REVOKED');raise Invalid('SOURCE_REVOKED')
        try:
            self.uploader(job['payload']['envelope'],self.env['ACADEMIC_OS_API_URL'],self.env['COLLECTOR_KEY_ID'],self.env['COLLECTOR_HMAC_SECRET'])
        except Exception as error:
            self.attempts.finish(ident,disposition(error),'SYNC_FAILED')
            if self.store.db.execute('SELECT 1 FROM processing_jobs WHERE id=?',(ident,)).fetchone():
                self.save(ident,job['source_id'],'sync_pending',job['payload'],'SYNC_FAILED')
            raise Invalid('SYNC_FAILED') from None
        self.store.mark_sync(job['source_id'])
        self.save(ident,job['source_id'],'synced',job['payload']);self.attempts.finish(ident,'complete');return {'id':ident,'state':'synced'}
