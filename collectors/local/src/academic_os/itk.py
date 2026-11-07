"""Automatic ITK Moodle LMS collection and structured extraction."""
import ctypes, glob, hashlib, hmac, json, os, re, sqlite3, struct, tempfile, urllib.request, uuid
from datetime import datetime, timezone
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
    m = re.match(r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})', clean)
    if m:
        day, mon_str, year, hh, mm = m.groups()
        mon = MONTHS.get(mon_str.lower())
        if mon:
            try:
                dt = datetime(int(year), mon, int(day), int(hh), int(mm), tzinfo=ZoneInfo(tz_name))
                return {'precision': 'datetime', 'local_date': None, 'local_datetime': dt.strftime('%Y-%m-%dT%H:%M:%S'), 'timezone': tz_name}
            except (ValueError, KeyError): pass
    # Format: 22 Okt, 11:00
    m2 = re.match(r'(\d{1,2})\s+([A-Za-z]+),?\s+(\d{1,2}):(\d{2})', clean)
    if m2:
        day, mon_str, hh, mm = m2.groups()
        mon = MONTHS.get(mon_str.lower())
        year = default_year or datetime.now(ZoneInfo(tz_name)).year
        if mon:
            try:
                dt = datetime(year, mon, int(day), int(hh), int(mm), tzinfo=ZoneInfo(tz_name))
                return {'precision': 'datetime', 'local_date': None, 'local_datetime': dt.strftime('%Y-%m-%dT%H:%M:%S'), 'timezone': tz_name}
            except (ValueError, KeyError): pass
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
                    raw = f.read()
                    buf = ctypes.create_string_buffer(size)
                    res = liblz4.LZ4_decompress_safe(raw, buf, len(raw), size)
                    if res == size:
                        js = json.loads(buf.raw[:size].decode('utf-8', 'replace'))
                        cookies = {c['name']: c['value'] for c in js.get('cookies', []) if 'kuliah.itk.ac.id' in c.get('host', '')}
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
                    cur.execute("SELECT name, value FROM moz_cookies WHERE host LIKE '%kuliah.itk.ac.id%'")
                    c_dict = dict(cur.fetchall())
                    conn.close()
                    if 'MoodleSession' in c_dict: return c_dict
            except Exception: pass

    raise Invalid('SESSION_NOT_FOUND')

def fetch_itk(path_or_url, cookies, base_url='https://kuliah.itk.ac.id', timeout=15):
    url = path_or_url if path_or_url.startswith('https://') else f"{base_url.rstrip('/')}/{path_or_url.lstrip('/')}"
    cookie_str = '; '.join(f"{k}={v}" for k, v in cookies.items())
    req = urllib.request.Request(url, headers={'Cookie': cookie_str, 'User-Agent': 'Mozilla/5.0 (AcademicOS-Collector)'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            text = resp.read().decode('utf-8', 'replace')
            if 'login/index.php' in resp.geturl() or '<title>Masuk' in text or 'id="login"' in text:
                raise Invalid('SESSION_EXPIRED')
            return text
    except urllib.error.HTTPError as e:
        if e.code in (401, 403): raise Invalid('SESSION_EXPIRED')
        raise Invalid(f"HTTP_{e.code}")

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

def discover_courses(cookies, base_url='https://kuliah.itk.ac.id'):
    html = fetch_itk('/my/', cookies, base_url=base_url)
    courses = []
    seen = set()
    # 1. Course overview in block_semester_sortierung
    m_sem = re.search(r'data-block="semester_sortierung"[^>]*>(.*?)</section>', html, re.S)
    scope = m_sem.group(1) if m_sem else html
    for url, cid, cname in re.findall(r'href="(https://kuliah\.itk\.ac\.id/course/view\.php\?id=(\d+))"[^>]*>(.*?)</a>', scope, re.S):
        clean = re.sub(r'<[^>]+>', '', cname).strip()
        if clean and cid not in seen:
            seen.add(cid)
            courses.append({'id': cid, 'name': clean, 'short': short_course_name(clean), 'url': url})
    return courses

def fetch_course_items(course, cookies, base_url='https://kuliah.itk.ac.id'):
    cid = course['id']
    items = []

    # 1. Assignments (/mod/assign/index.php?id=<cid>)
    try:
        html_assign = fetch_itk(f"/mod/assign/index.php?id={cid}", cookies, base_url=base_url)
        for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html_assign, re.S):
            cells = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', td)).strip() for td in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.S)]
            link_m = re.search(r'href="([^"]*mod/assign/view\.php\?id=(\d+))"', tr)
            if link_m and cells:
                aurl, aid = link_m.groups()
                title = cells[1] if len(cells) > 1 else cells[0]
                due_raw = cells[2] if len(cells) > 2 else ''
                status = cells[3] if len(cells) > 3 else ''
                due = parse_itk_date(due_raw)
                items.append({
                    'id': f"itk-assign-{aid}",
                    'raw_id': aid,
                    'kind': 'assignment',
                    'title': title,
                    'course_id': cid,
                    'course_name': course['name'],
                    'course_short': course['short'],
                    'url': aurl,
                    'due_raw': due_raw,
                    'due': due,
                    'submission_status': status,
                    'is_done': 'Terkirim' in status or 'Sudah diajukan' in status
                })
    except Invalid as e:
        if str(e) not in ('HTTP_404', 'HTTP_403'): raise

    # 2. Quizzes (/mod/quiz/index.php?id=<cid>)
    try:
        html_quiz = fetch_itk(f"/mod/quiz/index.php?id={cid}", cookies, base_url=base_url)
        for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html_quiz, re.S):
            cells = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', td)).strip() for td in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.S)]
            link_m = re.search(r'href="([^"]*mod/quiz/view\.php\?id=(\d+))"', tr)
            if link_m and cells:
                qurl, qid = link_m.groups()
                title = cells[1] if len(cells) > 1 else cells[0]
                close_raw = cells[2] if len(cells) > 2 else ''
                grade = cells[3] if len(cells) > 3 else ''
                due = parse_itk_date(close_raw)
                is_done = bool(grade and grade != '-')
                items.append({
                    'id': f"itk-quiz-{qid}",
                    'raw_id': qid,
                    'kind': 'exam' if ('midterm' in title.lower() or 'quiz 1' in title.lower()) else 'assignment',
                    'title': title,
                    'course_id': cid,
                    'course_name': course['name'],
                    'course_short': course['short'],
                    'url': qurl,
                    'due_raw': close_raw,
                    'due': due,
                    'submission_status': f"Nilai: {grade}" if grade else "Belum dikerjakan",
                    'is_done': is_done
                })
    except Invalid as e:
        if str(e) not in ('HTTP_404', 'HTTP_403'): raise

    return items

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

def import_itk(store, source_id, generation=1, cookies=None, profile_dir=None, pending_only=False):
    """Stores ITK LMS items into Store evidence and generates valid sync candidates."""
    store.allowed(source_id, generation)
    collected = collect_itk(cookies=cookies, profile_dir=profile_dir, pending_only=pending_only)
    candidates = []
    evidence_dict = {}

    batch_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    for item in collected['items']:
        evidence_id = str(uuid.uuid4())
        # Concise description: URL + submission status
        desc = f"Tugas ITK ({item['url']})"
        if item['submission_status']:
            desc += f" · {item['submission_status']}"
        desc = desc[:500]

        title = f"[{item['course_short']}] {item['title']}"[:240]

        record = {
            'text': f"{title}\n{desc}",
            'source_message_at': now_iso,
            'source_type': 'itk_lms',
            'course_id': item['course_id'],
            'course_name': item['course_name'],
            'activity_id': item['raw_id'],
            'activity_type': item['kind'],
            'url': item['url'],
            'submission_status': item['submission_status']
        }

        fp = store.fingerprint(['itk_lms', item['id'], item['title'], item['due_raw']])
        store.insert(source_id, generation, fp, record)
        ev_row = store.db.execute('SELECT id FROM evidence WHERE source_id=? AND generation=? AND fingerprint=?', (source_id, generation, fp)).fetchone()
        evidence_id = ev_row[0]
        evidence_dict[evidence_id] = {'id': evidence_id, 'source_id': source_id, 'payload': record}

        candidates.append({
            'draft_id': item['id'],
            'evidence_ids': [evidence_id],
            'confidence': 'high',
            'source_decision_state': 'confirmed_in_source',
            'needs_review': True,
            'issue_codes': [],
            'fields': {
                'kind': item['kind'],
                'title': title,
                'description': desc,
                'context_id': None,
                'context_type': 'academic',
                'assignee_scope': 'owner',
                'priority': 'normal',
                'due': item['due']
            }
        })

    # ai-extraction schema enforces maxItems: 50 candidates per batch.
    batches = []
    chunk_size = 40
    for i in range(0, len(candidates), chunk_size):
        chunk = candidates[i:i + chunk_size]
        sub_eids = {eid: evidence_dict[eid] for c in chunk for eid in c['evidence_ids']}
        batch_output = {
            'schema_version': '2.0',
            'batch_id': str(uuid.uuid4()),
            'candidates': chunk
        }
        validate_extraction(batch_output, sub_eids)
        batches.append(batch_output)

    if not batches:
        empty_batch = {'schema_version': '2.0', 'batch_id': str(uuid.uuid4()), 'candidates': []}
        validate_extraction(empty_batch, {})
        batches.append(empty_batch)

    return batches, {'courses': len(collected['courses']), 'tasks': len(candidates), 'batches': len(batches)}
