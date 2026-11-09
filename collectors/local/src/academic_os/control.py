"""Structured-only control reconciliation, independent of extraction/jobs."""
import os
from .pairing import Pairing
from .sync import source_status,purge_ack,collector_request
from .pipeline import configured
from .core import Store

def reconcile(store,env=None):
 env=os.environ if env is None else env
 keys=['ACADEMIC_OS_API_URL','COLLECTOR_KEY_ID','COLLECTOR_HMAC_SECRET','COLLECTOR_SOURCE_ID']
 if not all(configured(env.get(k,'')) for k in keys):return {'state':'unconfigured'}
 source=env['COLLECTOR_SOURCE_ID'];url,key,secret=[env[k] for k in keys[:3]]
 status=source_status(source,url,key,secret)
 store.observe_source(source,status)
 pairing=Pairing(store)
 devices=[r[0] for r in store.db.execute('SELECT id FROM devices WHERE source_id=?',(source,))]
 observations=[]
 for device,generation,phase in store.db.execute('SELECT a.device_id,a.generation,a.phase FROM device_action_observations a JOIN devices d ON d.id=a.device_id WHERE d.source_id=?',(source,)):
  observations.append({'device_id':device,'generation':generation,'phase':phase})
 store.db.execute("CREATE TABLE IF NOT EXISTS control_cursor(source_id TEXT PRIMARY KEY,offset INTEGER NOT NULL)");store.db.commit()
 cursor=store.db.execute("SELECT offset FROM control_cursor WHERE source_id=?",(source,)).fetchone();offset=cursor[0] if cursor else 0
 receipts=[]
 for device,batch,generation in store.db.execute('SELECT r.device_id,r.batch_id,d.generation FROM receipts r JOIN devices d ON d.id=r.device_id WHERE d.source_id=? ORDER BY r.rowid LIMIT 50 OFFSET ?',(source,offset)):
  phases=[r[0] for r in store.db.execute('SELECT phase FROM receipt_ack WHERE device_id=? AND batch_id=?',(device,batch))]
  for phase in phases or ['queued']:receipts.append({'device_id':device,'batch_id':batch,'generation':generation,'phase':phase})
 if status.get('purge_required'):
  # Exact generation prevents repeated poll increments and stale queue resurrection.
  row=store.db.execute('SELECT generation,enabled FROM sources WHERE id=?',(source,)).fetchone()
  if not row:raise ValueError('LOCAL_SOURCE_UNAVAILABLE')
  purged=store.db.execute('SELECT purged FROM source_operations WHERE source_id=?',(source,)).fetchone()[0]
  if not purged or row[1] or row[0]!=status['generation']:
   store.purge(source)
   with store.db:store.db.execute('UPDATE sources SET generation=? WHERE id=?',(status['generation'],source))
 collector_request(url,key,secret,'/api/v1/sync/device-actions','POST',{'source_id':source,'devices':devices,'observations':observations,'receipts':receipts[-100:]})
 with store.db:store.db.execute('INSERT OR REPLACE INTO control_cursor VALUES(?,?)',(source,offset+50 if receipts else 0))
 if status.get('purge_required'):
  ack=purge_ack(source,status['generation'],url,key,secret)
  if not isinstance(ack,dict) or ack.get('acknowledged') is not True:raise ValueError('PURGE_ACK_UNVERIFIED')
  store.mark_purge_ack(source,status['generation'])
 return {'state':'checked'}

def main():
 import argparse,json,time
 p=argparse.ArgumentParser();p.add_argument('--data-dir',required=True);p.add_argument('--watch',action='store_true');a=p.parse_args()
 while True:
  store=Store(a.data_dir)
  try:
   try:result=reconcile(store)
   except Exception:result={'state':'pending','error':'CONTROL_UNAVAILABLE'}
   print(json.dumps(result),flush=True)
  finally:store.db.close()
  if not a.watch:break
  time.sleep(30)
if __name__=='__main__':main()
