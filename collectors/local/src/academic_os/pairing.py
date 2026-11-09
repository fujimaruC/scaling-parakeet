"""Short-lived one-use pairing invites; all long-lived credentials stay local."""
import hashlib,json,secrets,time,uuid
from .core import Invalid
class Pairing:
 def __init__(self,store):
  self.store=store
  store.db.executescript('''CREATE TABLE IF NOT EXISTS receipt_ack(device_id TEXT NOT NULL,batch_id TEXT NOT NULL,phase TEXT NOT NULL,PRIMARY KEY(device_id,batch_id,phase));
  CREATE TABLE IF NOT EXISTS device_action_observations(device_id TEXT NOT NULL,generation INTEGER NOT NULL,phase TEXT NOT NULL,PRIMARY KEY(device_id,generation,phase));
  CREATE TABLE IF NOT EXISTS pairing_invites(digest TEXT PRIMARY KEY,source_id TEXT NOT NULL,generation INTEGER NOT NULL,expires_at INTEGER NOT NULL,device_id TEXT);
  CREATE TABLE IF NOT EXISTS device_purge_ack(device_id TEXT NOT NULL,generation INTEGER NOT NULL,acked_at INTEGER NOT NULL,PRIMARY KEY(device_id,generation));''');store.db.commit()
 def invite(self,source):
  row=self.store.db.execute('SELECT generation FROM sources WHERE id=? AND enabled=1',(source,)).fetchone()
  if not row:raise Invalid('SOURCE_REVOKED')
  self.store.allowed(source,row[0])
  token=secrets.token_urlsafe(32);digest=hashlib.sha256(token.encode()).hexdigest();expiry=int(time.time())+300
  with self.store.db:self.store.db.execute('INSERT INTO pairing_invites VALUES(?,?,?,?,NULL)',(digest,source,row[0],expiry))
  return {'token':token,'expires_at':expiry,'source_id':source,'source_generation':row[0]}
 def accept(self,token,device):
  uuid.UUID(device)
  if not isinstance(token,str) or len(token)>100:raise Invalid('PAIRING_DENIED')
  digest=hashlib.sha256(token.encode()).hexdigest()
  with self.store.db:
   row=self.store.db.execute('SELECT source_id,generation,expires_at,device_id FROM pairing_invites WHERE digest=?',(digest,)).fetchone()
   if not row or row[2]<time.time() or row[3] not in (None,device):raise Invalid('PAIRING_DENIED')
   self.store.allowed(row[0],row[1])
   if row[3] is None:
    claimed=self.store.db.execute('UPDATE pairing_invites SET device_id=? WHERE digest=? AND device_id IS NULL AND expires_at>=?',(device,digest,int(time.time()))).rowcount
    if claimed!=1:raise Invalid('PAIRING_DENIED')
    secret=secrets.token_urlsafe(48)
    # This transaction owns both invite consumption and durable device credential.
    self.store.db.execute('INSERT INTO devices VALUES(?,?,?,?,0)',(device,self.store.cipher.encrypt(secret.encode()),row[0],row[1]))
   else:
    prior=self.store.db.execute('SELECT secret,revoked FROM devices WHERE id=?',(device,)).fetchone()
    if not prior or prior[1]:raise Invalid('PAIRING_DENIED')
    secret=self.store.cipher.decrypt(prior[0]).decode()
  return {'device_id':device,'source_id':row[0],'source_generation':row[1],'secret':secret}
 def status(self,device):
  row=self.store.db.execute('SELECT d.source_id,d.generation,d.revoked,s.generation,s.enabled FROM devices d JOIN sources s ON s.id=d.source_id WHERE d.id=?',(device,)).fetchone()
  if not row:raise Invalid('ACCESS_DENIED')
  return {'device_id':device,'source_id':row[0],'source_generation':row[3],'revoked':bool(row[2]) or not row[4] or row[1]!=row[3]}
 def receipt(self,device,batch):
  uuid.UUID(batch)
  row=self.store.db.execute('SELECT count FROM receipts WHERE device_id=? AND batch_id=?',(device,batch)).fetchone()
  if not row:raise Invalid('RECEIPT_NOT_FOUND')
  return {'batch_id':batch,'count':row[0],'state':'committed'}
 def acknowledge_purge(self,device,generation,phase="applied"):
  if phase not in ("delivered","applied"):raise Invalid("INVALID_ACK")
  status=self.status(device)
  if not status['revoked'] or status['source_generation']!=generation:raise Invalid('INVALID_ACK')
  with self.store.db:
   self.store.db.execute('INSERT OR IGNORE INTO device_action_observations VALUES(?,?,?)',(device,generation,phase))
   if phase=='applied':self.store.db.execute('INSERT OR IGNORE INTO device_purge_ack VALUES(?,?,?)',(device,generation,int(time.time())))
  return {'acknowledged':True}

 def acknowledge_receipt(self,device,batch,phase):
  if phase not in ('delivered','applied'):raise Invalid('INVALID_ACK')
  self.receipt(device,batch)
  with self.store.db:self.store.db.execute('INSERT OR IGNORE INTO receipt_ack VALUES(?,?,?)',(device,batch,phase))
  return {'acknowledged':True}
