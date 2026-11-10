"""Automatic ITK Moodle LMS collection and structured extraction."""
import ctypes, glob, hashlib, hmac, json, os, re, sqlite3, struct, tempfile, urllib.request, uuid
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urljoin,urlsplit,parse_qs,urlencode
from zoneinfo import ZoneInfo
from .core import Invalid
from .contracts import validate_extraction

MONTHS = {
    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4,
    'mei': 5, 'juni': 6, 'juli': 7, 'agustus': 8,
    'september': 9, 'oktober': 10, 'november': 11, 'desember': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'agu': 8, 'agt': 8, 'aug': 8, 'sep': 9, 'okt': 10, 'oct': 10, 'nov': 11, 'des': 12, 'dec': 12
}

def parse_itk_date(date_str, tz_name='Asia/Makassar', default_year=None):
    if not date_str or date_str.strip() in ('-', '', 'No close date', 'Tidak ada batas waktu'):
        return {'precision': 'unknown', 'local_date': None, 'local_datetime': None, 'timezone': None}
    clean = re.sub(r'^[A-Za-z]+,\s*', '', date_str.strip())
    # Format: 22 Oktober 2026, 11:00
    m = re.fullmatch(r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})', clean)
    if m:
        day, mon_str, year, hh, mm = m.groups()
        mon = MONTHS.get(mon_str.lower())
        if mon:
            try:
                dt = datetime(int(year), mon, int(day), int(hh), int(mm), tzinfo=ZoneInfo(tz_name))
                return {'precision': 'datetime', 'local_date': None, 'local_datetime': dt.strftime('%Y-%m-%dT%H:%M:%S'), 'timezone': tz_name}
            except (ValueError, KeyError): pass
    # Format: 22 Okt, 11:00
    m2 = re.fullmatch(r'(\d{1,2})\s+([A-Za-z]+),?\s+(\d{1,2}):(\d{2})', clean)
    if m2:
        day, mon_str, hh, mm = m2.groups()
        mon = MONTHS.get(mon_str.lower())
        # A year missing from source data must not become today's year.
        if default_year is None:return {'precision':'unknown','local_date':None,'local_datetime':None,'timezone':None}
        year = default_year
        if mon:
            try:
                dt = datetime(year, mon, int(day), int(hh), int(mm), tzinfo=ZoneInfo(tz_name))
                return {'precision': 'datetime', 'local_date': None, 'local_datetime': dt.strftime('%Y-%m-%dT%H:%M:%S'), 'timezone': tz_name}
            except (ValueError, KeyError): pass
    m3=re.fullmatch(r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})',clean)
    if m3 and MONTHS.get(m3[2].lower()):
        try:
            local=datetime(int(m3[3]),MONTHS[m3[2].lower()],int(m3[1]))
            return {'precision':'date_only','local_date':local.strftime('%Y-%m-%d'),'local_datetime':None,'timezone':tz_name}
        except ValueError:pass
    return {'precision': 'unknown', 'local_date': None, 'local_datetime': None, 'timezone': None}

def find_session(profile_dir=None):
    """Zero-config session handoff: extracts MoodleSession from Firefox sessionstore."""
    dirs = [profile_dir] if profile_dir else [
        *glob.glob(os.path.expanduser('~/.config/mozilla/firefox/*')),
        *glob.glob(os.path.expanduser('~/.mozilla/firefox/*'))
    ]
    recovery_files = []
    for d in dirs:
        if not d or not os.path.isdir(d): continue
        for name in ('recovery.jsonlz4', 'recovery.baklz4', 'previous.jsonlz4'):
            f = os.path.join(d, 'sessionstore-backups', name)
            if os.path.isfile(f): recovery_files.append(f)

    recovery_files.sort(key=os.path.getmtime, reverse=True)
    liblz4 = None
    for name in ('liblz4.so.1', 'liblz4.so'):
        try:
            liblz4 = ctypes.CDLL(name)
            break
        except OSError: pass

    if liblz4:
        for fpath in recovery_files:
            try:
                with open(fpath, 'rb') as f:
                    if f.read(8) != b'mozLz40\0': continue
                    size = struct.unpack('<I', f.read(4))[0]
                    if not 0<size<=16*1024*1024:continue
                    raw = f.read()
                    buf = ctypes.create_string_buffer(size)
                    res = liblz4.LZ4_decompress_safe(raw, buf, len(raw), size)
                    if res == size:
                        js = json.loads(buf.raw[:size].decode('utf-8', 'replace'))
                        cookies = {c['name']: c['value'] for c in js.get('cookies', []) if c.get('host','').lstrip('.')=='kuliah.itk.ac.id' and c.get('name') in ('MoodleSession','HASH_MoodleSession')}
                        if 'MoodleSession' in cookies:
                            return cookies
            except Exception: pass

    # Fallback: check cookies.sqlite
    for d in dirs:
        cpath = os.path.join(d, 'cookies.sqlite')
        if os.path.isfile(cpath):
            try:
                with tempfile.TemporaryDirectory() as td:
                    dst = os.path.join(td, 'c.sqlite')
                    with open(cpath, 'rb') as sf, open(dst, 'wb') as df: df.write(sf.read())
                    wal = os.path.join(d, 'cookies.sqlite-wal')
                    if os.path.isfile(wal):
                        with open(wal, 'rb') as wf, open(os.path.join(td, 'c.sqlite-wal'), 'wb') as dwf: dwf.write(wf.read())
                    conn = sqlite3.connect(dst)
                    cur = conn.cursor()
                    cur.execute("SELECT name, value FROM moz_cookies WHERE host IN ('kuliah.itk.ac.id','.kuliah.itk.ac.id') AND name IN ('MoodleSession','HASH_MoodleSession')")
                    c_dict = dict(cur.fetchall())
                    conn.close()
                    if 'MoodleSession' in c_dict: return c_dict
            except Exception: pass

    raise Invalid('SESSION_NOT_FOUND')

PORTAL='https://kuliah.itk.ac.id'
def portal_url(path,base_url=PORTAL):
    base=urlsplit(base_url)
    if base.scheme!='https' or base.hostname!='kuliah.itk.ac.id' or base.port not in (None,443) or base.username or base.password:raise Invalid('ITK_ORIGIN_INVALID')
    value=urlsplit(urljoin(PORTAL+'/',path))
    if value.scheme!='https' or value.hostname!='kuliah.itk.ac.id' or value.port not in (None,443) or value.username or value.password:raise Invalid('ITK_ORIGIN_INVALID')
    return value.geturl()
class PortalRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        portal_url(newurl)
        return super().redirect_request(req,fp,code,msg,headers,newurl)
def _open_portal(request,timeout):
    return urllib.request.build_opener(PortalRedirect()).open(request,timeout=timeout)
def normalise_cookies(value):
    if not isinstance(value,dict) or not value.get('MoodleSession') or set(value)-{'MoodleSession','HASH_MoodleSession'}:raise Invalid('ITK_COOKIE_INVALID')
    if any(not isinstance(v,str) or not 1<=len(v)<=4096 or re.search(r'[\s;\x00-\x1f\x7f]',v) for v in value.values()):raise Invalid('ITK_COOKIE_INVALID')
    return value

def fetch_itk(path_or_url,cookies,base_url=PORTAL,timeout=15):
    url=portal_url(path_or_url,base_url);cookies=normalise_cookies(cookies)
    request=urllib.request.Request(url,headers={'Cookie':'; '.join(k+'='+v for k,v in cookies.items()),'User-Agent':'AcademicOS-Local-Collector'})
    try:
        with _open_portal(request,timeout) as response:
            final=portal_url(response.geturl())
            raw=response.read(4*1024*1024+1)
            if len(raw)>4*1024*1024:raise Invalid('ITK_RESPONSE_TOO_LARGE')
            text=raw.decode('utf-8','replace')
            if '/login/' in final or re.search(r'id=[\"\']login[\"\']|<title>\s*(Masuk|Log in)',text,re.I):raise Invalid('SESSION_EXPIRED')
            return text
    except urllib.error.HTTPError as error:
        if error.code in (401,403):raise Invalid('SESSION_EXPIRED') from None
        raise Invalid('HTTP_'+str(error.code)) from None
    except (urllib.error.URLError,TimeoutError,OSError):raise Invalid('ITK_UNAVAILABLE') from None

class PortalHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.links=[];self.rows=[];self.cells=None;self.cell=None;self.anchor=None;self.table=False;self.overview=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('data-block') in ('semester_sortierung','myoverview'):self.overview=True
        if tag=='table':self.table=True
        if tag=='tr':self.cells=[]
        if tag in ('td','th') and self.cells is not None:self.cell={'text':'','links':[]}
        if tag=='a':self.anchor={'url':a.get('href',''),'text':''}
    def handle_data(self,text):
        if self.cell is not None:self.cell['text']+=text+' '
        if self.anchor is not None:self.anchor['text']+=text
    def handle_endtag(self,tag):
        if tag=='a' and self.anchor is not None:
            self.links.append(self.anchor)
            if self.cell is not None:self.cell['links'].append(self.anchor)
            self.anchor=None
        if tag in ('td','th') and self.cell is not None:
            self.cell['text']=' '.join(self.cell['text'].split())
            if self.cells is None:raise Invalid('ITK_MARKUP_CHANGED')
            self.cells.append(self.cell);self.cell=None
        if tag=='tr' and self.cells is not None:self.rows.append(self.cells);self.cells=None

def discover_courses(cookies,base_url=PORTAL):
    page=PortalHTML();page.feed(fetch_itk('/my/',cookies,base_url=base_url));courses=[];seen=set()
    for link in page.links:
        try:url=portal_url(link['url'],base_url)
        except Invalid:continue
        parsed=urlsplit(url);ident=parse_qs(parsed.query).get('id',[''])[0]
        if parsed.path!='/course/view.php' or not ident.isdigit() or ident in seen:continue
        name=' '.join(link['text'].split())
        if not name:continue
        seen.add(ident);courses.append({'id':ident,'name':name,'short':short_course_name(name),'url':PORTAL+'/course/view.php?id='+ident})
    if not courses and not page.overview:raise Invalid('ITK_MARKUP_CHANGED')
    return courses

def fetch_course_items(course,cookies,base_url=PORTAL):
    if not str(course.get('id','')).isdigit():raise Invalid('ITK_COURSE_INVALID')
    result=[]
    for module in ('assign','quiz'):
        try:html=fetch_itk('/mod/'+module+'/index.php?id='+str(course['id']),cookies,base_url=base_url)
        except Invalid as error:
            if str(error)=='HTTP_404':raise Invalid('ITK_MODULE_UNAVAILABLE') from None
            raise
        page=PortalHTML();page.feed(html)
        if not page.table:raise Invalid('ITK_MARKUP_CHANGED')
        due_index=status_index=None
        for cells in page.rows:
            names=[c['text'].lower() for c in cells]
            for i,name in enumerate(names):
                if name in ('jatuh tempo','due date','due','quiz closes','close date','waktu tutup'):due_index=i
                if name in (('pengajuan','submission','submission status','status') if module=='assign' else ('grade','nilai')):status_index=i
            for cell in cells:
                for link in cell['links']:
                    try:url=portal_url(link['url'],base_url)
                    except Invalid:
                        if '/mod/'+module+'/view.php' in link['url']:raise Invalid('ITK_MARKUP_CHANGED') from None
                        continue
                    parsed=urlsplit(url);ident=parse_qs(parsed.query).get('id',[''])[0]
                    if parsed.path!='/mod/'+module+'/view.php':continue
                    if not ident.isdigit() or due_index is None or due_index>=len(cells):raise Invalid('ITK_MARKUP_CHANGED')
                    title=' '.join(link['text'].split())
                    if not title:raise Invalid('ITK_MARKUP_CHANGED')
                    due_raw=cells[due_index]['text'];status=cells[status_index]['text'] if status_index is not None and status_index<len(cells) else ''
                    due=parse_itk_date(due_raw)
                    # Completion is only a source observation/filter, never a
                    # canonical task mutation or inference of owner approval.
                    done=('terkirim' in status.lower() or 'sudah diajukan' in status.lower()) if module=='assign' else bool(status and status!='-')
                    result.append({'id':'itk-'+module+'-'+ident,'raw_id':ident,'kind':'exam' if module=='quiz' and ('midterm' in title.lower() or 'quiz 1' in title.lower()) else 'assignment','activity_type':module,'title':title,'course_id':str(course['id']),'course_name':course['name'],'course_short':course['short'],'url':PORTAL+'/mod/'+module+'/view.php?id='+ident,'due_raw':due_raw,'due':due,'submission_status':('Nilai: '+status if module=='quiz' and status else status),'is_done':done,'date_ambiguous':due['precision']=='unknown' and due_raw.strip() not in ('','-','No close date','Tidak ada batas waktu')})
        if not any(name in ('jatuh tempo','due date','due','quiz closes','close date','waktu tutup') for row in page.rows for name in [c['text'].lower() for c in row]):raise Invalid('ITK_MARKUP_CHANGED')
    return result

def short_course_name(name):
    clean = re.sub(r'\s*-\s*[A-Za-z0-9]+$', '', name).strip()
    # Common Indonesian academic abbreviations
    abbrev_map = {'algoritme dan pemrograman': 'Alpro', 'matematika diskrit 1': 'Matdis 1', 'manajemen dan organisasi': 'Manorg', 'kemampuan interpersonal dan kepemimpinan': 'KIK', 'konsep sistem informasi': 'KSI', 'infrastruktur ti': 'Infra TI', 'praktikum algoritme dan pemrograman': 'Prak Alpro'}
    lower = clean.lower()
    for k, v in abbrev_map.items():
        if k in lower: return v
    words = clean.split()
    if len(words) <= 3: return clean
    return ' '.join(words[:2])

def collect_itk(cookies=None, profile_dir=None, base_url='https://kuliah.itk.ac.id', pending_only=False):
    c = cookies or find_session(profile_dir)
    courses = discover_courses(c, base_url=base_url)
    all_items = []
    seen = set()
    for course in courses:
        items = fetch_course_items(course, c, base_url=base_url)
        for it in items:
            if it['id'] not in seen:
                seen.add(it['id'])
                if not (pending_only and it['is_done']):
                    all_items.append(it)
    return {'courses': courses, 'items': all_items}

def import_itk(store,source_id,generation=1,cookies=None,profile_dir=None,pending_only=False,collected=None):
    """Persist local evidence atomically; generate only structured review proposals."""
    store.allowed(source_id,generation)
    observed=collect_itk(cookies=cookies,profile_dir=profile_dir,pending_only=pending_only) if collected is None else collected
    if not isinstance(observed,dict) or not isinstance(observed.get('items'),list):raise Invalid('ITK_PREVIEW_INVALID')
    candidates=[];evidence={};now=datetime.now(timezone.utc).isoformat()
    with store.db:
        store.db.execute('BEGIN IMMEDIATE');store.allowed(source_id,generation)
        for item in observed['items']:
            title=('['+item['course_short']+'] '+item['title'])[:240]
            url=portal_url(item['url']);parsed=urlsplit(url);ident=parse_qs(parsed.query).get('id',[''])[0]
            if not ident.isdigit() or parsed.path not in ('/mod/assign/view.php','/mod/quiz/view.php'):raise Invalid('ITK_PREVIEW_INVALID')
            url=PORTAL+parsed.path+'?id='+ident
            # Status/grades stay in the local preview/evidence; cloud description is only the canonical activity URL.
            desc=('Tugas ITK ('+url+')')[:500]
            record={'text':title+'\n'+desc,'source_message_at':None,'source_type':'itk_lms','course_id':item['course_id'],'course_name':item['course_name'],'activity_id':ident,'activity_type':item['kind'],'url':url,'submission_status':item['submission_status']}
            fp=store.fingerprint(['itk_lms',item['id'],item['title'],item['due'],item['submission_status']]);store.insert(source_id,generation,fp,record)
            eid=store.db.execute('SELECT id FROM evidence WHERE source_id=? AND generation=? AND fingerprint=?',(source_id,generation,fp)).fetchone()[0]
            evidence[eid]=record
            candidates.append({'draft_id':item['id'],'evidence_ids':[eid],'confidence':'unknown' if item.get('date_ambiguous') else 'high','source_decision_state':'unclear' if item.get('date_ambiguous') else 'confirmed_in_source','needs_review':True,'issue_codes':['ambiguous_date'] if item.get('date_ambiguous') else [],'fields':{'kind':item['kind'],'title':title,'description':desc,'context_id':None,'context_type':'academic','assignee_scope':'owner','priority':'normal','due':item['due']}})
        store.db.execute('UPDATE source_operations SET last_import_at=? WHERE source_id=?',(now,source_id))
    batches=[];chunk=[];size=0
    for candidate in candidates:
        cost=len(evidence[candidate['evidence_ids'][0]]['text'])
        if chunk and (len(chunk)>=40 or size+cost>9000):
            batches.append({'schema_version':'2.0','batch_id':str(uuid.uuid4()),'candidates':chunk});chunk=[];size=0
        chunk.append(candidate);size+=cost
    if chunk or not batches:batches.append({'schema_version':'2.0','batch_id':str(uuid.uuid4()),'candidates':chunk})
    for batch in batches:validate_extraction(batch,evidence)
    return batches,{'courses':len(observed['courses']),'tasks':len(candidates),'batches':len(batches),'ambiguous_dates':sum(bool(i.get('date_ambiguous')) for i in observed['items'])}
