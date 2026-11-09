"""Disposable restore parity across every canonical table; never production D1."""
import hashlib,json,sqlite3,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from academic_os.backup import ALLOWED,encrypt,restore
ROOT=Path(__file__).resolve().parents[3]
class CanonicalRestoreContractTests(unittest.TestCase):
 def test_all_eleven_tables_restore_counts_hashes_tombstones_without_dispatch_or_credentials(self):
  expected=['contexts','tasks','task_events','sources','source_items','candidates','candidate_evidence','review_actions','source_tombstones','settings','task_evidence']
  self.assertEqual(ALLOWED,expected)
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
   for file in sorted((ROOT/'apps/worker/migrations').glob('*.sql')):db.executescript(file.read_text())
   at='2030-01-01T00:00:00Z';unknown={'precision':'unknown','local_date':None,'local_datetime':None,'timezone':None}
   db.execute("INSERT INTO contexts(id,type,display_name) VALUES('org','organization','Synthetic organization')")
   db.execute("INSERT INTO sources(id,display_name,kind,generation,purged_at) VALUES('source','Synthetic purged source','whatsapp_export',2,?)",(at,))
   db.execute("INSERT INTO source_items(id,source_id,generation,observed_at,local_evidence_available,removed_at) VALUES('evidence','source',1,?,0,?)",(at,at))
   db.execute("INSERT INTO tasks(id,context_id,title,kind,status,priority,due_json,created_at,updated_at,deleted_at) VALUES('task','org','Synthetic tombstone','organizational_duty','todo','normal',?,?,?,?)",(json.dumps(unknown),at,at,at))
   db.execute("INSERT INTO candidates(id,source_id,generation,fields_json,issues_json,review_status,created_at,updated_at) VALUES('proposal','source',1,'{}','[]','rejected',?,?)",(at,at))
   db.execute("INSERT INTO candidate_evidence VALUES('proposal','evidence')");db.execute("INSERT INTO review_actions VALUES('review','proposal','reject',?)",(at,));db.execute("INSERT INTO source_tombstones VALUES('source',1,?)",(at,));db.execute("INSERT INTO task_evidence VALUES('task','evidence','review')")
   # Populate excluded authority/delivery tables so empty-fixture success cannot hide a leak.
   db.execute("INSERT INTO collector_credentials VALUES('credential','source','SYNTHETIC_AUTHORITY_NOT_EXPORTABLE',1)")
   db.execute("INSERT INTO push_subscriptions VALUES('push','https://fcm.googleapis.com/fcm/send/SYNTHETIC_ENDPOINT',?,NULL,'synthetic-key')",(at,))
   db.execute("INSERT INTO reminder_intents(id,task_id,due_revision,scheduled_for_utc) VALUES('intent','task',1,?)",(at,))
   tables={t:[dict(r) for r in db.execute('SELECT * FROM '+t)] for t in ALLOWED};db.close()
   self.assertTrue(all(tables.values()));export=root/'canonical.json';export.write_text(json.dumps({'schema_version':'2.0','tables':tables}))
   encrypt(export,root/'backup.enc',root/'backup.key');self.assertNotIn(b'Synthetic tombstone',(root/'backup.enc').read_bytes())
   counts=restore(root/'backup.enc',root/'backup.key',root/'restored.sqlite',ROOT/'apps/worker/migrations');self.assertEqual(counts,{t:len(rows) for t,rows in tables.items()})
   def digest(rows):return hashlib.sha256(json.dumps(sorted(rows,key=lambda r:json.dumps(r,sort_keys=True)),sort_keys=True).encode()).hexdigest()
   with sqlite3.connect(root/'restored.sqlite') as restored:
    restored.row_factory=sqlite3.Row
    for table in ALLOWED:self.assertEqual(digest([dict(r) for r in restored.execute('SELECT * FROM '+table)]),digest(tables[table]),table)
    for table in ['reminder_intents','notification_inbox','collector_credentials','owner_client_credentials','owner_client_grants','push_subscriptions','push_attempts','operational_usage']:self.assertEqual(restored.execute('SELECT count(*) FROM '+table).fetchone()[0],0,table)
    self.assertEqual(restored.execute("SELECT generation FROM source_tombstones WHERE source_id='source'").fetchone()[0],1);self.assertIsNotNone(restored.execute("SELECT deleted_at FROM tasks WHERE id='task'").fetchone()[0]);self.assertEqual(restored.execute('SELECT count(*) FROM reminder_rebuilds').fetchone()[0],0)
