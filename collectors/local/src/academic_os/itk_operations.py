"""Authenticated local Moodle controls. Cookie/profile inputs are never persisted."""
import html,json,uuid
from datetime import datetime,timezone
from .core import Invalid
from . import itk
from .sync import project
from .contracts import validate_extraction
from .jobs import serialized

MESSAGES={
 'SESSION_NOT_FOUND':('Sesi Firefox tidak ditemukan. Masuk ke Moodle pada profil terpilih.','No session found. Sign in to Moodle in the selected Firefox profile.'),
 'SESSION_EXPIRED':('Sesi Moodle kedaluwarsa. Masuk kembali lalu pratinjau ulang.','Moodle session expired. Sign in again and preview again.'),
 'ITK_MARKUP_CHANGED':('Struktur halaman Moodle berubah; tidak ada hasil kosong yang dianggap berhasil.','Moodle markup changed; unavailable data is not treated as an empty success.'),
 'ITK_SESSION_SELECTION_REQUIRED':('Pilih tepat satu: cookie sesi atau jalur profil Firefox.','Choose exactly one: a session cookie or Firefox profile path.'),
 'ITK_COOKIE_INVALID':('Format cookie sesi tidak valid.','Invalid session cookie format.'),
 'ITK_MODULE_UNAVAILABLE':('Halaman aktivitas Moodle tidak tersedia; cakupan tidak dianggap lengkap.','Moodle activity page unavailable; coverage is not considered complete.'),
 'ITK_UNAVAILABLE':('Portal tidak tersedia; tidak ada panggilan cloud.','Portal unavailable; no cloud call was made.'),
 'SOURCE_GENERATION_CHANGED':('Generasi sumber berubah. Muat ulang sebelum melanjutkan.','Source generation changed. Reload before continuing.'),
 'ITK_SOURCE_KIND_CONFLICT':('UUID ini bukan sumber ITK. Gunakan sumber ITK yang didaftarkan khusus.','This UUID is not an ITK source. Use an explicitly enrolled ITK source.'),
}
def initialise(store):
 store.db.executescript("""CREATE TABLE IF NOT EXISTS local_source_kinds(source_id TEXT PRIMARY KEY REFERENCES sources(id),kind TEXT NOT NULL CHECK(kind='itk_lms'));
 CREATE TABLE IF NOT EXISTS local_itk_batches(source_id TEXT NOT NULL,generation INTEGER NOT NULL,fingerprint TEXT NOT NULL,job_id TEXT NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,PRIMARY KEY(source_id,generation,fingerprint));""");store.db.commit()
def generation(value):
 if isinstance(value,bool):raise Invalid('EXPLICIT_SOURCE_GENERATION_REQUIRED')
 try:n=int(value)
 except (TypeError,ValueError):raise Invalid('EXPLICIT_SOURCE_GENERATION_REQUIRED') from None
 if not 1<=n<=2147483647:raise Invalid('EXPLICIT_SOURCE_GENERATION_REQUIRED')
 return n
def selection(p,value,required=True):
 ident=value.get('source_id');expected=generation(value.get('generation'))
 try:uuid.UUID(ident)
 except (ValueError,TypeError,AttributeError):raise Invalid('SOURCE_NOT_FOUND') from None
 row=p.store.db.execute('SELECT generation,enabled FROM sources WHERE id=?',(ident,)).fetchone()
 if row:
  if row[0]!=expected:raise Invalid('SOURCE_GENERATION_CHANGED')
  if required and not p.store.db.execute("SELECT 1 FROM local_source_kinds WHERE source_id=? AND kind='itk_lms'",(ident,)).fetchone():raise Invalid('ITK_SOURCE_KIND_CONFLICT')
  p.store.allowed(ident,expected)
 elif required:raise Invalid('SOURCE_NOT_FOUND')
 return ident,expected,row

@serialized
def stage(p,source,expected,collected):
 # No provider call: Moodle metadata is parsed deterministically. Every proposal
 # still requires projection review, then separate canonical owner approval.
 p.store.allowed(source,expected)
 batches,summary=itk.import_itk(p.store,source,expected,collected=collected)
 jobs=[]
 for output in batches:
  if not output['candidates']:continue
  validate_extraction(output,{e['id'] for e in p.store.evidence() if e['source_id']==source})
  fingerprint=p.store.fingerprint(['itk_lms',source,expected,output['candidates']])
  old=p.store.db.execute('SELECT job_id FROM local_itk_batches WHERE source_id=? AND generation=? AND fingerprint=?',(source,expected,fingerprint)).fetchone()
  if old and p.store.db.execute('SELECT 1 FROM processing_jobs WHERE id=?',(old[0],)).fetchone():jobs.append(p.get(old[0]));continue
  envelope=project(p.store,source,output);ident=str(uuid.uuid4())
  with p.store.db:
   p.store.db.execute('BEGIN IMMEDIATE');p.store.allowed(source,expected)
   if envelope['source_generation']!=expected:raise Invalid('SOURCE_GENERATION_CHANGED')
   payload={'origin':'itk_lms','evidence_ids':sorted({eid for c in output['candidates'] for eid in c['evidence_ids']}),'envelope':envelope}
   encoded=p.store.cipher.encrypt(json.dumps(payload).encode())
   p.store.db.execute('INSERT INTO processing_jobs VALUES(?,?,?,?,?,?)',(ident,source,'awaiting_projection_review',encoded,None,datetime.now(timezone.utc).isoformat()))
   p.store.db.execute("INSERT INTO processing_retry VALUES(?,'local_lms','complete',0,NULL,NULL)",(ident,))
   p.store.db.execute('INSERT INTO local_itk_batches VALUES(?,?,?,?)',(source,expected,fingerprint,ident))
  jobs.append(p.get(ident))
 return {'source_id':source,'generation':expected,'kind':'itk_lms','coverage':'observed_pages_only','courses':collected['courses'],'items':collected['items'],'summary':summary,'jobs':jobs,'cloud_calls':0,'provider_calls':0}

def action(p,value):
 initialise(p.store)
 command=value.get('action')
 if command=='enroll':
  with p.store.db:
   p.store.db.execute('BEGIN IMMEDIATE')
   source,expected,row=selection(p,value,required=False)
   if row and not p.store.db.execute("SELECT 1 FROM local_source_kinds WHERE source_id=?",(source,)).fetchone():raise Invalid('ITK_SOURCE_KIND_CONFLICT')
   if not row:
    p.store.db.execute('INSERT INTO sources VALUES(?,?,1)',(source,expected))
    p.store.db.execute('INSERT INTO source_operations(source_id,first_generation) VALUES(?,?)',(source,expected))
   p.store.db.execute("INSERT OR IGNORE INTO local_source_kinds VALUES(?,'itk_lms')",(source,))
  return {'enrolled':True,'kind':'itk_lms','source_id':source,'generation':expected}
 source,expected,_=selection(p,value)
 if command=='preview':
  if value.get('confirmed')!='yes':raise Invalid('ITK_LOCAL_ACCESS_CONSENT_REQUIRED')
  cookie=value.get('session_cookie','');profile=value.get('profile_path','');extra=value.get('hash_cookie','')
  if not isinstance(cookie,str) or not isinstance(profile,str) or bool(cookie)==bool(profile):raise Invalid('ITK_SESSION_SELECTION_REQUIRED')
  if len(profile)>4096:raise Invalid('ITK_SESSION_SELECTION_REQUIRED')
  cookies={'MoodleSession':cookie,**({'HASH_MoodleSession':extra} if extra else {})} if cookie else itk.find_session(profile)
  cookies=itk.normalise_cookies(cookies)
  collected=itk.collect_itk(cookies=cookies,pending_only=value.get('pending_only') in ('yes',True))
  # Do not put inputs, cookies, profile paths or page HTML into results/jobs.
  p.store.allowed(source,expected)
  return stage(p,source,expected,collected)
 if command=='queue':
  if value.get('confirmed')!='yes':raise Invalid('PROJECTION_REVIEW_REQUIRED')
  job=p.get(value.get('job_id'))
  if job['source_id']!=source:raise Invalid('JOB_SOURCE_MISMATCH')
  if job['payload'].get('origin')!='itk_lms':raise Invalid('ITK_JOB_REQUIRED')
  if job['payload']['envelope']['source_generation']!=expected:raise Invalid('SOURCE_GENERATION_CHANGED')
  return {'queued':p.queue(job['id'],True)['id'],'source_id':source,'generation':expected,'canonical_approval':False}
 raise Invalid('INVALID_ITK_ACTION')

def page(p,result=None,error=None,lang='id'):
 initialise(p.store);lang=lang if lang in ('id','en') else 'id';en=lang=='en';esc=lambda v:html.escape(str(v),quote=True)
 def text(id,en_text):return en_text if en else id
 hidden='<input type=hidden name=lang value="'+lang+'">'
 out=['<!doctype html><html lang="'+lang+'"><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Academic OS · ITK Moodle</title><style>body{font:1rem system-ui;max-width:75rem;margin:auto;padding:1rem;color:#203b34;background:#f7f8f2}input,button,select{font:inherit;min-height:48px;margin:.4rem;padding:.4rem}input[type=checkbox]{min-width:48px}button{cursor:pointer}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #174db3;outline-offset:3px}label{display:block}table{border-collapse:collapse;width:100%}th,td{padding:.6rem;border:1px solid #61766e;overflow-wrap:anywhere}.scroll{overflow:auto}pre{white-space:pre-wrap}</style><h1>ITK Moodle</h1><p><a href="/operations">'+text('Operasi lokal','Local operations')+'</a> · <a href="/itk?lang=id">Indonesia</a> · <a href="/itk?lang=en">English</a></p><p>'+text('Akses hanya saat Anda meminta pratinjau. Cookie, HTML dan jalur profil tetap lokal. Pratinjau bukan persetujuan tugas.','Collection runs only on explicit preview. Cookies, HTML and profile paths stay local. Preview is not task approval.')+'</p>']
 if error:
  message=MESSAGES.get(error,('Operasi diblokir; periksa sumber, generasi, dan konfigurasi lokal.','Operation blocked; inspect source, generation and local configuration.'))[1 if en else 0]
  out.append('<p role=alert>'+esc(message)+' <code>'+esc(error)+'</code></p>')
 out.append('<h2>'+text('Daftarkan sumber ITK','Enroll ITK source')+'</h2><form method=post action="/itk/enroll">'+hidden+'<label>Source UUID<input name=source_id required autocomplete=off></label><label>'+text('Generasi','Generation')+'<input name=generation type=number min=1 value=1 required></label><button>'+text('Daftarkan itk_lms secara lokal','Enroll itk_lms locally')+'</button></form><h2>'+text('Ambil pratinjau lokal','Collect local preview')+'</h2>')
 rows=list(p.store.db.execute("SELECT s.id,s.generation FROM sources s JOIN local_source_kinds k ON k.source_id=s.id WHERE k.kind='itk_lms' AND s.enabled=1 ORDER BY s.id"))
 for source,expected in rows:
  controls=hidden+'<input type=hidden name=source_id value="'+esc(source)+'"><input type=hidden name=generation value="'+str(expected)+'">'
  out.append('<form method=post action="/itk/preview"><fieldset><legend>'+esc(source)+' · '+str(expected)+'</legend>'+controls+'<label>MoodleSession<input name=session_cookie type=password autocomplete=off spellcheck=false></label><label>HASH_MoodleSession ('+text('opsional','optional')+')<input name=hash_cookie type=password autocomplete=off spellcheck=false></label><p>'+text('ATAU jalur profil Firefox yang dipilih:','OR explicit Firefox profile directory:')+'</p><label>'+text('Jalur profil','Profile path')+'<input name=profile_path autocomplete=off></label><label><input type=checkbox name=pending_only value=yes checked>'+text('Hanya status sumber belum selesai','Only source-reported pending items')+'</label><label><input type=checkbox name=confirmed value=yes required>'+text('Saya mengizinkan pembacaan portal dengan sesi ini untuk sumber ini.','I authorize local portal collection with this session for this source.')+'</label><button>'+text('Pratinjau dan simpan proposal lokal','Preview and stage local proposals')+'</button></fieldset></form>')
 if not rows:out.append('<p role=status>'+text('Belum ada sumber ITK terdaftar.','No ITK source is enrolled.')+'</p>')
 if result is not None:
  if 'courses' in result:
   out.append('<h2>'+text('Halaman yang diamati saja','Observed pages only')+'</h2><p role=status>'+text('Tidak ada sinkronisasi Academic OS atau panggilan AI. Tanggal ambigu tetap tanpa waktu pasti.','No Academic OS sync or AI calls. Ambiguous dates keep unknown precision.')+'</p><ul>')
   for course in result['courses']:out.append('<li>'+esc(course['name'])+'</li>')
   out.append('</ul><div class=scroll><table><thead><tr>'+''.join('<th scope=col>'+esc(t)+'</th>' for t in [text('Mata kuliah','Course'),text('Judul','Title'),text('Jenis','Kind'),text('Tenggat / presisi','Deadline / precision'),text('Status sumber','Source status')])+'</tr></thead><tbody>')
   for item in result['items']:out.append('<tr>'+''.join('<td>'+esc(t)+'</td>' for t in [item['course_name'],item['title'],item.get('activity_type',item['kind']),json.dumps(item['due'],ensure_ascii=False),item['submission_status']])+'</tr>')
   out.append('</tbody></table></div>')
   for job in result['jobs']:
    out.append('<h3>'+esc(job['id'])+' · '+esc(job['state'])+'</h3><details open><summary>'+text('Tinjau proyeksi terstruktur','Review structured projection')+'</summary><pre>'+esc(json.dumps(job['payload']['envelope']['candidates'],ensure_ascii=False,indent=2))+'</pre></details>')
    if job['state']=='awaiting_projection_review':
     out.append('<form method=post action="/itk/queue">'+hidden+'<input type=hidden name=source_id value="'+esc(result['source_id'])+'"><input type=hidden name=generation value="'+str(result['generation'])+'"><input type=hidden name=job_id value="'+esc(job['id'])+'"><label><input type=checkbox name=confirmed value=yes required>'+text('Saya telah meninjau proyeksi ini. Antrekan hanya mengirim proposal, bukan menyetujui tugas.','I reviewed this projection. Queuing sends proposals; it does not approve tasks.')+'</label><button>'+text('Konfirmasi proyeksi dan antrekan','Confirm projection and queue')+'</button></form>')
  else:out.append('<p role=status>'+esc(json.dumps(result,ensure_ascii=False))+'</p>')
 out.append('<p>'+text('Gunakan alur job lokal untuk sinkronisasi dengan kredensial sumber yang sesuai. Setiap tugas tetap memerlukan persetujuan pemilik.','Use the local job workflow to sync with the matching source credential. Each task still needs owner approval.')+'</p></html>')
 return ''.join(out)
