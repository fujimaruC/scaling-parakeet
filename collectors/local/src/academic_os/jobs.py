"""Durable bounded attempt metadata. No content, credentials or error text here."""
import argparse
import fcntl
import functools
import json
import os
import socket
import time
import urllib.error
from contextlib import contextmanager
from .core import Invalid, Store

MAX_ATTEMPTS = {'extract': 2, 'sync': 5}
BASE_DELAY = 30
MAX_DELAY = 900


def disposition(error):
    # Only a definite refusal or failure before a connection is safe to replay.
    # A 5xx gateway error/timeout may follow processing: leave it unknown.
    if isinstance(error, urllib.error.HTTPError):
        return 'retry' if error.code == 429 else 'failed' if 400 <= error.code < 500 else 'unknown'
    if isinstance(error, urllib.error.URLError):
        if isinstance(error.reason, (ConnectionRefusedError, socket.gaierror)):
            return 'retry'
        return 'unknown'
    if isinstance(error, (Invalid, ValueError)) or error.__class__.__module__.startswith('jsonschema'):
        return 'failed'
    return 'unknown'


@contextmanager
def job_lock(store):
    # One writer across the CLI and HTTP process, released by the OS on death.
    with open(store.directory / 'processing.lock', 'a') as lock:
        os.chmod(store.directory / 'processing.lock', 0o600)
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise Invalid('JOB_RUNNER_BUSY') from None
        try:
            yield
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def serialized(fn):
    @functools.wraps(fn)
    def wrapped(self, *args, **kwargs):
        with job_lock(self.store):
            return fn(self, *args, **kwargs)
    return wrapped


class Attempts:
    def __init__(self, store, clock=time.time):
        self.store, self.clock = store, clock
        store.db.executescript('''
        CREATE TABLE IF NOT EXISTS processing_retry(
          job_id TEXT PRIMARY KEY REFERENCES processing_jobs(id) ON DELETE CASCADE,
          phase TEXT NOT NULL,state TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,
          next_attempt_at REAL,last_attempt_at REAL);
        CREATE TABLE IF NOT EXISTS processing_attempts(
          job_id TEXT NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
          phase TEXT NOT NULL,attempt INTEGER NOT NULL,started_at REAL NOT NULL,
          finished_at REAL,outcome TEXT NOT NULL,error_code TEXT,
          PRIMARY KEY(job_id,phase,attempt));''')
        store.db.commit()

    def prepare(self, ident, phase):
        with self.store.db:
            self.store.db.execute("INSERT INTO processing_retry VALUES(?,?,'ready',0,NULL,NULL) ON CONFLICT(job_id) DO UPDATE SET phase=excluded.phase,state='ready',attempts=0,next_attempt_at=NULL,last_attempt_at=NULL", (ident, phase))

    def begin(self, ident, phase, manual=False):
        row = self.store.db.execute('SELECT state,attempts,next_attempt_at FROM processing_retry WHERE job_id=? AND phase=?', (ident, phase)).fetchone()
        if not row:
            raise Invalid('JOB_REVIEW_REQUIRED')
        state, count, due = row
        if state == 'running':
            self.finish(ident, 'unknown', 'INTERRUPTED_ATTEMPT')
            raise Invalid('JOB_OUTCOME_UNKNOWN')
        if count >= MAX_ATTEMPTS[phase] or state in ('failed','exhausted','complete'):
            raise Invalid('JOB_TERMINAL')
        if state == 'unknown' and not (manual and phase == 'sync'):
            raise Invalid('JOB_OUTCOME_UNKNOWN')
        if due is not None and self.clock() < due:
            raise Invalid('JOB_BACKOFF')
        now = self.clock()
        # Claim and journal commit before any request, including source preflight.
        with self.store.db:
            self.store.db.execute("UPDATE processing_retry SET state='running',attempts=?,next_attempt_at=NULL,last_attempt_at=? WHERE job_id=?", (count+1,now,ident))
            self.store.db.execute("INSERT INTO processing_attempts VALUES(?,?,?,?,NULL,'running',NULL)", (ident,phase,count+1,now))

    def begin_legacy(self,ident):
        if self.store.db.execute("SELECT 1 FROM processing_attempts WHERE job_id=? AND phase='legacy_sync'",(ident,)).fetchone():raise Invalid('LEGACY_MANUAL_ALREADY_ATTEMPTED')
        self.store.db.execute("INSERT INTO processing_attempts VALUES(?,'legacy_sync',1,?,NULL,'running',NULL)",(ident,self.clock()))

    def finish(self, ident, outcome, error=None):
        row = self.store.db.execute('SELECT phase,attempts FROM processing_retry WHERE job_id=?', (ident,)).fetchone()
        if not row:
            # Never create a retry row, including after purge or interruption.
            state='failed' if outcome=='retry' else outcome
            with self.store.db:self.store.db.execute("UPDATE processing_attempts SET finished_at=?,outcome=?,error_code=? WHERE job_id=? AND phase='legacy_sync' AND attempt=1",(self.clock(),state,error,ident))
            return
        phase, count = row
        state = outcome
        due = None
        if outcome == 'retry':
            state = 'waiting' if count < MAX_ATTEMPTS[phase] else 'exhausted'
            if state == 'waiting':
                due = self.clock() + min(MAX_DELAY,BASE_DELAY * 2**(count-1))
        with self.store.db:
            self.store.db.execute('UPDATE processing_retry SET state=?,next_attempt_at=? WHERE job_id=?',(state,due,ident))
            self.store.db.execute('UPDATE processing_attempts SET finished_at=?,outcome=?,error_code=? WHERE job_id=? AND phase=? AND attempt=?',(self.clock(),state,error,ident,phase,count))

    def view(self, ident):
        row = self.store.db.execute('SELECT phase,state,attempts,next_attempt_at,last_attempt_at FROM processing_retry WHERE job_id=?',(ident,)).fetchone()
        if row:return dict(zip(('phase','state','attempts','next_attempt_at','last_attempt_at'),row))
        legacy=self.store.db.execute("SELECT outcome,finished_at FROM processing_attempts WHERE job_id=? AND phase='legacy_sync'",(ident,)).fetchone()
        return {'state':'legacy_manual_only','manual_attempted':bool(legacy),'manual_outcome':('unknown' if legacy[1] is None else legacy[0]) if legacy else None}

    def history(self, ident):
        return [dict(zip(('phase','attempt','started_at','finished_at','outcome','error_code'),r)) for r in self.store.db.execute('SELECT phase,attempt,started_at,finished_at,outcome,error_code FROM processing_attempts WHERE job_id=? ORDER BY started_at,phase,attempt',(ident,))]

    def recover(self, source):
        # Called only while holding job_lock: no live sender can own these claims.
        rows = list(self.store.db.execute("SELECT r.job_id,j.state,r.phase FROM processing_retry r JOIN processing_jobs j ON j.id=r.job_id WHERE j.source_id=? AND r.state='running'",(source,)))
        for ident,state,phase in rows:
            if state=='synced' or (state=='awaiting_projection_review' and phase=='extract'):
                self.finish(ident,'complete')
            else:
                self.finish(ident,'unknown','INTERRUPTED_ATTEMPT')


def tick(pipeline, source):
    """At most one due job per tick; separate from transport control polling."""
    with job_lock(pipeline.store):
        pipeline.attempts.recover(source)
        row = pipeline.store.db.execute("SELECT r.job_id,r.phase FROM processing_retry r JOIN processing_jobs j ON j.id=r.job_id WHERE j.source_id=? AND (r.state='ready' OR (r.state='waiting' AND r.next_attempt_at<=?)) ORDER BY COALESCE(r.next_attempt_at,0),j.created_at,j.id LIMIT 1",(source,pipeline.attempts.clock())).fetchone()
        if not row:
            return {'state':'idle'}
        ident,phase = row
        try:
            if phase == 'extract':
                pipeline._extract_job(ident)
            else:
                pipeline._send_job(ident,manual=False)
        except Invalid:
            pass  # Fixed codes are durable on the job; never print exception text.
        return {'state':'checked','job_id':ident,'retry':pipeline.attempts.view(ident)}


def main():
    from .pipeline import Pipeline, configured
    parser=argparse.ArgumentParser()
    parser.add_argument('--data-dir',required=True)
    parser.add_argument('--watch',action='store_true')
    args=parser.parse_args()
    source=os.environ.get('COLLECTOR_SOURCE_ID','')
    if not configured(source):
        parser.error('Set COLLECTOR_SOURCE_ID to the explicit source for this process')
    while True:
        store=Store(args.data_dir)
        try:
            try:
                result=tick(Pipeline(store),source)
            except Exception:
                result={'state':'unavailable','error_code':'JOB_RUNNER_UNAVAILABLE'}
            print(json.dumps(result),flush=True)
        finally:
            store.db.close()
        if not args.watch:
            break
        time.sleep(5)

if __name__ == '__main__':
    main()
