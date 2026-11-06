"""Canonical structured-data backup. Never include raw evidence or secrets."""
import argparse,json,os,sqlite3,hashlib
from pathlib import Path
from cryptography.fernet import Fernet
ALLOWED=['contexts','tasks','task_events','sources','source_items','candidates','candidate_evidence','review_actions','source_tombstones','settings','task_evidence']
def encrypt(export,output,key_path):
    value=json.loads(Path(export).read_text())
    if value.get('schema_version')!='2.0' or set(value['tables'])!=set(ALLOWED):raise ValueError('Unsupported canonical export')
    fd=os.open(key_path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    key=Fernet.generate_key()
    with os.fdopen(fd,'wb') as f:f.write(key)
    fd=os.open(output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'wb') as f:f.write(Fernet(key).encrypt(json.dumps(value,sort_keys=True).encode()))
def restore(archive,key_path,database,migration):
    if Path(database).exists():raise ValueError('Restore requires a new disposable database')
    value=json.loads(Fernet(Path(key_path).read_bytes()).decrypt(Path(archive).read_bytes()))
    if value.get('schema_version')!='2.0' or set(value['tables'])!=set(ALLOWED):raise ValueError('Unsupported canonical export')
    db=sqlite3.connect(database)
    try:
        migrations=sorted(Path(migration).glob('*.sql')) if Path(migration).is_dir() else [Path(migration)]
        for item in migrations:db.executescript(item.read_text())
        with db:
            triggers=db.execute("SELECT name,sql FROM sqlite_master WHERE type='trigger'").fetchall()
            for name,_ in triggers:db.execute('DROP TRIGGER "'+name+'"')
            db.execute('DELETE FROM settings')
            for table in ALLOWED:
                columns={r[1] for r in db.execute('PRAGMA table_info('+table+')')}
                for row in value['tables'][table]:
                    if not isinstance(row,dict) or not set(row)<=columns:raise ValueError('Invalid columns')
                    names=list(row)
                    db.execute('INSERT INTO '+table+'('+','.join('"'+c+'"' for c in names)+') VALUES('+','.join('?' for _ in names)+')',[row[c] for c in names])
            for _,sql in triggers:db.execute(sql)
            if db.execute('PRAGMA foreign_key_check').fetchall():raise ValueError('Invalid references')
            # Restore contains no dispatch intents, push subscriptions or credentials.
        actual={t:[dict(zip([r[1] for r in db.execute('PRAGMA table_info('+t+')')],r)) for r in db.execute('SELECT * FROM '+t)] for t in ALLOWED}
        def digest(rows):return hashlib.sha256(json.dumps(sorted(rows,key=lambda x:json.dumps(x,sort_keys=True)),sort_keys=True).encode()).hexdigest()
        if any(digest(actual[t])!=digest(value['tables'][t]) for t in ALLOWED):raise ValueError('Restore parity failed')
        if db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='reminder_rebuilds'").fetchone():
            with db:db.execute("INSERT OR REPLACE INTO reminder_rebuilds SELECT id,due_revision FROM tasks WHERE deleted_at IS NULL AND status NOT IN ('done','archived')")
        return {t:len(actual[t]) for t in ALLOWED}
    finally:db.close()
def main():
    p=argparse.ArgumentParser();sub=p.add_subparsers(dest='operation',required=True)
    enc=sub.add_parser('encrypt');enc.add_argument('export');enc.add_argument('output');enc.add_argument('--key',required=True)
    dec=sub.add_parser('restore');dec.add_argument('archive');dec.add_argument('--key',required=True);dec.add_argument('--database',required=True);dec.add_argument('--migration',required=True)
    a=p.parse_args()
    if a.operation=='encrypt':encrypt(a.export,a.output,a.key)
    else:print(json.dumps(restore(a.archive,a.key,a.database,a.migration)))
if __name__=='__main__':main()
