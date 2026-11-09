import hashlib, hmac, json, os, re, sqlite3, uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from cryptography.fernet import Fernet

HEADER = re.compile(r"^(?:\[)?(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2})[.:](\d{2})(?::(\d{2}))?(?:\])?\s+(?:-\s+)?(.+)$")
class Invalid(ValueError): pass

def parse_export(text, timezone='Asia/Makassar'):
    records=[]; current=None; warnings=[]
    for line in text.lstrip('\ufeff').splitlines():
        match=HEADER.match(line)
        if match:
            ds, hh, mm, ss, rest=match.groups()
            try:
                dd,mo,year=map(int,ds.split('/'));year=year+2000 if year<100 else year
                timestamp=datetime(year,mo,dd,int(hh),int(mm),int(ss or 0),tzinfo=ZoneInfo(timezone)).isoformat()
            except ValueError:
                warnings.append('invalid_timestamp');timestamp=None
            sender,sep,body=rest.partition(': ')
            current={'source_message_at':timestamp,'sender':sender if sep else None,'text':body if sep else rest,'kind':'message' if sep else 'system'};records.append(current)
        elif current:current['text']+='\n'+line
        elif line.strip():warnings.append('unparsed_prefix')
    if not records:raise Invalid('UNSUPPORTED_FORMAT')
    return records,warnings

class Store:
    def __init__(self,directory):
        self.directory=Path(directory).resolve();self.directory.mkdir(mode=0o700,parents=True,exist_ok=True);os.chmod(self.directory,0o700)
        keypath=self.directory/'evidence.key'
        try:
            fd=os.open(keypath,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        except FileExistsError:pass
        else:
            with os.fdopen(fd,'wb') as f:f.write(Fernet.generate_key())
        self.key=keypath.read_bytes();self.cipher=Fernet(self.key)
        self.db=sqlite3.connect(self.directory/'evidence.sqlite',check_same_thread=False)
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY,generation INTEGER NOT NULL,enabled INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS imports(id TEXT PRIMARY KEY,source_id TEXT NOT NULL,digest TEXT NOT NULL,UNIQUE(source_id,digest));
        CREATE TABLE IF NOT EXISTS evidence(id TEXT PRIMARY KEY,source_id TEXT NOT NULL,generation INTEGER NOT NULL,fingerprint TEXT NOT NULL,payload BLOB NOT NULL,UNIQUE(source_id,generation,fingerprint));
        CREATE TABLE IF NOT EXISTS receipts(device_id TEXT NOT NULL,batch_id TEXT NOT NULL,digest TEXT NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(device_id,batch_id));
        CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,secret BLOB NOT NULL,source_id TEXT NOT NULL,generation INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS nonces(device_id TEXT NOT NULL,nonce TEXT NOT NULL,stamp INTEGER NOT NULL,PRIMARY KEY(device_id,nonce));
        CREATE TABLE IF NOT EXISTS source_operations(source_id TEXT PRIMARY KEY REFERENCES sources(id),first_generation INTEGER NOT NULL,cloud_generation INTEGER,cloud_paused INTEGER,cloud_purge INTEGER,status_observed_at TEXT,last_import_at TEXT,last_sync_at TEXT,purged INTEGER NOT NULL DEFAULT 0,local_paused INTEGER NOT NULL DEFAULT 0,cloud_revoked INTEGER,purge_ack_generation INTEGER,purge_ack_at TEXT);
        INSERT OR IGNORE INTO source_operations(source_id,first_generation,purged) SELECT id,generation,CASE WHEN enabled=0 THEN 1 ELSE 0 END FROM sources;
        """);self.db.commit()
    def enroll(self,source_id,generation=1):
        uuid.UUID(source_id)
        with self.db:
            self.db.execute('INSERT INTO sources VALUES(?,?,1)',(source_id,generation))
            self.db.execute('INSERT INTO source_operations(source_id,first_generation) VALUES(?,?)',(source_id,generation))
    def allowed(self,source_id,generation):
        if not self.db.execute('SELECT 1 FROM sources s JOIN source_operations o ON o.source_id=s.id WHERE s.id=? AND s.generation=? AND s.enabled=1 AND o.local_paused=0 AND COALESCE(o.cloud_purge,0)=0 AND (o.cloud_generation IS NULL OR o.cloud_generation=s.generation) AND COALESCE(o.cloud_paused,0)=0 AND COALESCE(o.cloud_revoked,0)=0',(source_id,generation)).fetchone():raise Invalid('SOURCE_REVOKED')
    def observe_source(self,source,status):
        generation=status.get('generation')
        if not isinstance(generation,int) or isinstance(generation,bool) or generation<1:raise Invalid('INVALID_SOURCE_STATUS')
        with self.db:
            self.db.execute('UPDATE source_operations SET cloud_generation=?,cloud_paused=?,cloud_purge=?,cloud_revoked=?,status_observed_at=? WHERE source_id=?',(generation,int(bool(status.get('paused'))),int(bool(status.get('purge_required'))),int(bool(status.get('revoked'))),datetime.now(timezone.utc).isoformat(),source))
            local=self.db.execute('SELECT generation FROM sources WHERE id=?',(source,)).fetchone()
            if local and (generation!=local[0] or status.get('paused') or status.get('purge_required') or status.get('revoked')):
                self.db.execute('UPDATE source_operations SET local_paused=1 WHERE source_id=?',(source,))
    def mark_purge_ack(self,source,generation):
        with self.db:
            self.db.execute('UPDATE source_operations SET purge_ack_generation=?,purge_ack_at=? WHERE source_id=? AND purged=1 AND EXISTS(SELECT 1 FROM sources WHERE id=? AND generation=?)',(generation,datetime.now(timezone.utc).isoformat(),source,source,generation))
    def mark_sync(self,source):
        with self.db:self.db.execute('UPDATE source_operations SET last_sync_at=? WHERE source_id=?',(datetime.now(timezone.utc).isoformat(),source))
    def fingerprint(self,value):return hmac.new(self.key,json.dumps(value,sort_keys=True,ensure_ascii=False).encode(),hashlib.sha256).hexdigest()
    def insert(self,source_id,generation,fingerprint,payload):
        self.db.execute('INSERT OR IGNORE INTO evidence VALUES(?,?,?,?,?)',(str(uuid.uuid4()),source_id,generation,fingerprint,self.cipher.encrypt(json.dumps(payload,ensure_ascii=False).encode())))
    def import_text(self,source_id,text,generation=1):
        self.allowed(source_id,generation)
        if len(text.encode())>25*1024*1024:raise Invalid('OVERSIZE')
        records,warnings=parse_export(text);digest=self.fingerprint(text.replace('\r\n','\n'));occurrences=Counter()
        with self.db:
            if self.db.execute('UPDATE sources SET generation=generation WHERE id=? AND generation=? AND enabled=1',(source_id,generation)).rowcount!=1:raise Invalid('SOURCE_REVOKED')
            self.db.execute('UPDATE source_operations SET last_import_at=? WHERE source_id=?',(datetime.now(timezone.utc).isoformat(),source_id))
            self.allowed(source_id,generation)
            old=self.db.execute('SELECT id FROM imports WHERE source_id=? AND digest=?',(source_id,digest)).fetchone()
            if old:return {'import_id':old[0],'inserted':0,'warnings':warnings}
            before=self.db.execute('SELECT count(*) FROM evidence').fetchone()[0]
            for record in records:
                base=self.fingerprint(record);occurrences[base]+=1;fingerprint=self.fingerprint([base,occurrences[base]])
                self.insert(source_id,generation,fingerprint,record)
            ident=str(uuid.uuid4());self.db.execute('INSERT INTO imports VALUES(?,?,?)',(ident,source_id,digest))
            after=self.db.execute('SELECT count(*) FROM evidence').fetchone()[0]
        return {'import_id':ident,'inserted':after-before,'warnings':warnings,'coverage':'export_window'}
    def register_device(self,device_id,source_id,generation,secret):
        self.allowed(source_id,generation)
        with self.db:self.db.execute('INSERT INTO devices VALUES(?,?,?,?,0)',(device_id,self.cipher.encrypt(secret.encode()),source_id,generation))
    def receive(self,device_id,batch):
        dev=self.db.execute('SELECT source_id,generation,revoked FROM devices WHERE id=?',(device_id,)).fetchone()
        if not dev or dev[2]:raise Invalid('ACCESS_DENIED')
        source,generation=dev[:2];self.allowed(source,generation)
        if set(batch)!={'protocol','device_id','batch_id','source_id','source_generation','events'} or batch['protocol']!=1 or batch['device_id']!=device_id or batch['source_id']!=source or batch['source_generation']!=generation:raise Invalid('INVALID_BATCH')
        uuid.UUID(batch['batch_id']);events=batch['events']
        if not isinstance(events,list) or len(events)>100:raise Invalid('INVALID_BATCH')
        if len(json.dumps(batch).encode())>262144:raise Invalid('OVERSIZE')
        digest=self.fingerprint(batch)
        with self.db:
            live=self.db.execute('UPDATE sources SET generation=generation WHERE id=? AND generation=? AND enabled=1',(source,generation)).rowcount
            if live!=1:raise Invalid('SOURCE_REVOKED')
            self.allowed(source,generation)
            old=self.db.execute('SELECT digest,count FROM receipts WHERE device_id=? AND batch_id=?',(device_id,batch['batch_id'])).fetchone()
            if old:
                if old[0]!=digest:raise Invalid('IDEMPOTENCY_CONFLICT')
                return {'batch_id':batch['batch_id'],'state':'committed','count':old[1]}
            for e in events:
                if set(e)!={'event_id','captured_at','source_message_at','text'} or not isinstance(e['text'],str) or len(e['text'])>16000:raise Invalid('INVALID_EVENT')
                uuid.UUID(e['event_id']);datetime.fromisoformat(e['captured_at'])
                if e['source_message_at'] is not None:datetime.fromisoformat(e['source_message_at'])
                fingerprint=self.fingerprint([device_id,e['event_id']])
                previous=self.db.execute('SELECT payload FROM evidence WHERE source_id=? AND generation=? AND fingerprint=?',(source,generation,fingerprint)).fetchone()
                if previous and json.loads(self.cipher.decrypt(previous[0]))!=e:raise Invalid('EVENT_REVISION_CONFLICT')
                self.insert(source,generation,fingerprint,e)
            self.db.execute('INSERT INTO receipts VALUES(?,?,?,?)',(device_id,batch['batch_id'],digest,len(events)))
        return {'batch_id':batch['batch_id'],'state':'committed','count':len(events)}
    def purge(self,source):
        with self.db:
            self.db.execute('UPDATE sources SET enabled=0,generation=generation+1 WHERE id=?',(source,))
            self.db.execute('UPDATE source_operations SET purged=1,purge_ack_generation=NULL,purge_ack_at=NULL WHERE source_id=?',(source,))
            self.db.execute('DELETE FROM evidence WHERE source_id=?',(source,));self.db.execute('DELETE FROM imports WHERE source_id=?',(source,));self.db.execute('UPDATE devices SET revoked=1 WHERE source_id=?',(source,))
            for table in ['processing_jobs','processing_consent']:
                if self.db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone():self.db.execute('DELETE FROM '+table+' WHERE source_id=?',(source,))
    def evidence(self):
        return [{'id':r[0],'source_id':r[1],'payload':json.loads(self.cipher.decrypt(r[2]))} for r in self.db.execute('SELECT id,source_id,payload FROM evidence')]
