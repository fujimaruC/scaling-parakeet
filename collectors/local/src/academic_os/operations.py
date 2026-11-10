"""Server-rendered source operations. No implicit source or shared credential."""
import html
import json
from .core import Invalid


def sources(pipeline):
    store=pipeline.store
    result=[]
    for row in store.db.execute('SELECT s.id,s.generation,s.enabled,o.first_generation,o.cloud_generation,o.cloud_paused,o.cloud_purge,o.status_observed_at,o.last_import_at,o.last_sync_at,o.purged,o.local_paused,o.cloud_revoked,o.purge_ack_generation,o.purge_ack_at FROM sources s JOIN source_operations o ON o.source_id=s.id ORDER BY s.id'):
        ident,generation,enabled,first,cloud,paused,purge,observed,last_import,last_sync,purged,local_paused,revoked,ack_generation,ack_at=row
        try:
            policy=pipeline.policy(ident)
            consent=policy['mode']
        except Invalid:
            consent='stale_policy' if store.db.execute('SELECT 1 FROM processing_consent WHERE source_id=?',(ident,)).fetchone() else 'disabled'
        pending=store.db.execute("SELECT count(*) FROM devices d WHERE d.source_id=? AND d.revoked=1 AND NOT EXISTS(SELECT 1 FROM device_purge_ack a WHERE a.device_id=d.id AND a.generation=?)",(ident,generation)).fetchone()[0]
        pending_purge=bool(purge or purged or pending) and (not purged or ack_generation!=generation or not ack_at or pending>0)
        kind=store.db.execute('SELECT kind FROM local_source_kinds WHERE source_id=?',(ident,)).fetchone() if store.db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='local_source_kinds'").fetchone() else None
        result.append({'kind':kind[0] if kind else 'local_unspecified','source_id':ident,'generation':generation,'state':'revoked' if not enabled else 'paused' if local_paused else 'enabled','consent_mode':consent,'last_import_at':last_import,'last_sync_at':last_sync,'status_observed_at':observed,'cloud_generation':cloud,'cloud_paused':None if paused is None else bool(paused),'pending_purge':bool(pending_purge),'purge_status':'pending' if pending_purge else 'confirmed_known_inventory' if purged else 'none_recorded','cloud_credential_revoked':None if revoked is None else bool(revoked),'unconfirmed_devices':pending,'purged':bool(purged),'generation_warning':generation!=first or (cloud is not None and cloud!=generation) or consent=='stale_policy'})
    return result


def action(pipeline,value):
    # Hold the source-generation check through the write across processes.
    with pipeline.store.db:
        pipeline.store.db.execute('BEGIN IMMEDIATE')
        return _action(pipeline,value)


def _action(pipeline,value):
    # Every form carries both its row identity and the generation it displayed.
    ident=value.get('source_id');expected=value.get('generation')
    try:expected=int(expected)
    except (ValueError,TypeError):raise Invalid('EXPLICIT_SOURCE_GENERATION_REQUIRED') from None
    row=pipeline.store.db.execute('SELECT generation,enabled FROM sources WHERE id=?',(ident,)).fetchone()
    if not row:raise Invalid('SOURCE_NOT_FOUND')
    if row[0]!=expected:raise Invalid('SOURCE_GENERATION_CHANGED')
    command=value.get('action')
    if command=='revoke':return pipeline.consent(ident,False)
    if command=='consent':
        if value.get('confirmed')!='yes':raise Invalid('CONSENT_REQUIRED')
        # Reject stale submitted disclosure, including changes between GET and POST.
        if any(value.get(k)!=v for k,v in pipeline.config().items()):raise Invalid('CONSENT_REQUIRED')
        return pipeline.consent(ident,True)
    if command not in ('pause','resume'):raise Invalid('INVALID_SOURCE_ACTION')
    op=pipeline.store.db.execute('SELECT cloud_generation,cloud_paused,cloud_purge,purged,cloud_revoked FROM source_operations WHERE source_id=?',(ident,)).fetchone()
    if command=='resume' and (not row[1] or op[1] or op[2] or op[3] or op[4] or (op[0] is not None and op[0]!=expected)):
        raise Invalid('SOURCE_RECONCILIATION_REQUIRED')
    # CAS, so another process changing generation cannot apply an old form.
    with pipeline.store.db:
        if pipeline.store.db.execute('UPDATE source_operations SET local_paused=? WHERE source_id=? AND EXISTS(SELECT 1 FROM sources WHERE id=? AND generation=?)',(int(command=='pause'),ident,ident,expected)).rowcount!=1:
            raise Invalid('SOURCE_GENERATION_CHANGED')
    return {'source_id':ident,'state':'paused' if command=='pause' else 'enabled'}


def job_action(pipeline,value):
    if value.get('action')!='legacy-send' or value.get('confirmed')!='yes':raise Invalid('MANUAL_SEND_CONFIRMATION_REQUIRED')
    try:generation=int(value.get('generation'))
    except (TypeError,ValueError):raise Invalid('EXPLICIT_SOURCE_GENERATION_REQUIRED') from None
    return pipeline.send_legacy(value.get('job_id'),value.get('source_id'),generation)


def page(pipeline,error=None,before=None):
    esc=lambda v:html.escape(str(v),quote=True)
    config=pipeline.config()
    out=['''<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Academic OS · Local operations</title><style>body{font:1rem system-ui;max-width:78rem;margin:auto;padding:1rem;color:#203b34;background:#f7f8f2}table{border-collapse:collapse;width:100%}th,td{padding:.8rem;border:1px solid #61766e;vertical-align:top;overflow-wrap:anywhere}button,input{font:inherit;min-height:48px}button{padding:.7rem;margin:.3rem;cursor:pointer}input[type=checkbox]{min-width:48px;vertical-align:middle}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #174db3;outline-offset:3px}.scroll{overflow:auto}.warning{font-weight:bold}dt{font-weight:bold}dd{margin:0 0 .6rem}form{margin:.5rem 0}</style><h1>Local source operations</h1><a href="/">Import, evidence and projection review</a><p>Each row acts only on its named source and displayed generation. There is no current/default source. Pausing stops local intake and jobs; revoking AI consent does not delete evidence. Cloud and phone state below are last observations, never live guarantees.</p>''']
    out.append('<p><a href="/itk">ITK Moodle: local session, preview and projection review / sesi lokal, pratinjau dan tinjauan proyeksi</a></p>')
    if error:out.append('<p role=alert>'+esc(error)+'</p>')
    out.append('<p>Configured extraction route: '+esc(config['provider'])+' / '+esc(config['model'])+' at '+esc(config['route'])+'. External selected content requires the consent checkbox in that source row. Retries use this same policy; a change requires new consent.</p>')
    out.append('<div class=scroll><table><caption>Enrolled sources — times are observed UTC timestamps; unavailable means no retained observation</caption><thead><tr><th scope=col>Source / generation</th><th scope=col>State / consent</th><th scope=col>Observations</th><th scope=col>Actions on this source only</th></tr></thead><tbody>')
    rows=sources(pipeline)
    for r in rows:
        ident=r['source_id'];generation=r['generation']
        warning='<p class=warning role=status>Generation changed or consent is stale. Reconcile with cloud; no generation is silently adopted.</p>' if r['generation_warning'] else ''
        hidden='<input type=hidden name=source_id value="'+esc(ident)+'"><input type=hidden name=generation value="'+str(generation)+'">'
        hidden+=''.join('<input type=hidden name="'+k+'" value="'+esc(v)+'">' for k,v in config.items())
        out.append('<tr><th scope=row>'+esc(ident)+'<p>Generation '+str(generation)+'</p>'+warning+'</th><td>'+esc(r['state'])+'<p>AI: '+esc(r['consent_mode'])+'</p></td><td><dl>')
        for label,key in [('Last import','last_import_at'),('Last successful proposal sync','last_sync_at'),('Last cloud status observation','status_observed_at'),('Last cloud generation','cloud_generation')]:
            out.append('<dt>'+label+'</dt><dd>'+esc(r[key] if r[key] is not None else 'unavailable')+'</dd>')
        out.append('<dt>Pending purge</dt><dd>'+esc(r['purge_status'])+'; inventory incomplete'+'</dd><dt>Unconfirmed known devices</dt><dd>'+str(r['unconfirmed_devices'])+'</dd></dl></td><td>')
        for command,label in [('pause','Pause local intake/jobs'),('resume','Resume local intake/jobs'),('revoke','Revoke AI consent')]:
            out.append('<form method=post action="/operations/action">'+hidden+'<button name=action value="'+command+'" aria-label="'+label+' for '+esc(ident)+'">'+label+'</button></form>')
        out.append('<form method=post action="/operations/action">'+hidden+'<label><input type=checkbox name=confirmed value=yes required> I approve selected redacted content from '+esc(ident)+' via the disclosed provider/policy, including bounded retries until revocation.</label><button name=action value=consent>Enable AI consent for this source</button></form></td></tr>')
    out.append('</tbody></table></div>')
    if not rows:out.append('<p>No locally enrolled sources. Enroll a source explicitly in the import screen.</p>')
    out.append('<h2>Durable jobs</h2><p>One separate job process per explicitly configured source. Waiting means scheduled; unknown means no automatic replay. Projection review and canonical owner approval remain separate.</p><div class=scroll><table><thead><tr><th>Job / source</th><th>Stage</th><th>Retry state / attempts</th><th>Next UTC epoch / error</th></tr></thead><tbody>')
    jobs=pipeline.jobs(before)
    for j in jobs:
        r=j['retry'];out.append('<tr><th scope=row>'+esc(j['id'])+'<p>'+esc(j['source_id'])+'</p></th><td>'+esc(j['state'])+'</td><td>'+esc(r['state'])+' / '+esc(r.get('attempts','unavailable'))+'</td><td>'+esc(r.get('next_attempt_at') or 'none')+' / '+esc(j['error_code'] or 'none')+'<details><summary>Attempt history</summary><pre>'+esc(json.dumps(pipeline.attempts.history(j['id']),indent=2))+'</pre></details></td></tr>')
        if r['state']=='legacy_manual_only':
            out.append('<tr><td colspan=4><p>This job predates retry metadata, so it is manual-only. No automatic replay is allowed.</p>')
            if r.get('manual_attempted'):
                out.append('<p>One-time send already attempted: '+esc(r.get('manual_outcome'))+'. A second send is refused. An unknown result is not success; inspect attempt history before reconciling.</p>')
            elif j['state']=='sync_pending':
                source=pipeline.store.db.execute('SELECT generation FROM sources WHERE id=?',(j['source_id'],)).fetchone()
                if source:
                    out.append('<form method=post action="/operations/job-action"><input type=hidden name=job_id value="'+esc(j['id'])+'"><input type=hidden name=source_id value="'+esc(j['source_id'])+'"><input type=hidden name=generation value="'+str(source[0])+'"><label><input type=checkbox name=confirmed value=yes required> Send this already reviewed structured projection once for '+esc(j['source_id'])+'. This does not approve a canonical task.</label><button name=action value=legacy-send>Send legacy job once</button></form>')
            else:
                out.append('<p>No reviewed sync-pending projection is available to send. The existing stage is shown above. Extraction is never replayed from this screen.</p>')
            out.append('</td></tr>')
    out.append('</tbody></table></div>')
    if len(jobs)==100:out.append('<a href="/operations?before='+str(jobs[-1]['cursor'])+'">Older jobs</a>')
    out.append('<p>Up to 100 jobs are shown on this page. <a href="/operations">Newest jobs</a>. Refresh this page for current local state. Detailed projection and explicit immutable sync retry are available in the import screen.</p></html>')
    return ''.join(out)
