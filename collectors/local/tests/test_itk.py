"""Unit and contract tests for ITK Moodle LMS collector."""
import json, tempfile, unittest, uuid, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))

from academic_os.core import Store, Invalid
from academic_os.itk import parse_itk_date, short_course_name, discover_courses, fetch_course_items, import_itk
from academic_os.sync import project

MOCK_DASHBOARD_HTML = """<!DOCTYPE html>
<html>
<head><title>Dasbor | Elearning ITK</title></head>
<body>
<section data-block="semester_sortierung" class="block_semester_sortierung">
  <div class="card-body">
    <a href="https://kuliah.itk.ac.id/course/view.php?id=6869">Algoritme dan Pemrograman - A2627</a>
    <a href="https://kuliah.itk.ac.id/course/view.php?id=7368">Matematika Diskrit 1 - A2627</a>
  </div>
</section>
</body>
</html>"""

MOCK_ASSIGN_INDEX_HTML = """<!DOCTYPE html>
<html>
<body>
<table class="generaltable">
<thead>
<tr><th>Tile</th><th>Penugasan</th><th>Jatuh tempo</th><th>Pengajuan</th><th>Nilai</th></tr>
</thead>
<tbody>
<tr>
  <td>Minggu 1</td>
  <td><a href="https://kuliah.itk.ac.id/mod/assign/view.php?id=480811">Tugas 1</a></td>
  <td>Kamis, 17 September 2026, 10:00</td>
  <td>Terkirim dan siap dinilai</td>
  <td>100.00</td>
</tr>
<tr>
  <td>Minggu 2</td>
  <td><a href="https://kuliah.itk.ac.id/mod/assign/view.php?id=484750">Tugas 2 Praktikum</a></td>
  <td>Kamis, 22 Oktober 2026, 11:00</td>
  <td>Belum mengajukan</td>
  <td>-</td>
</tr>
</tbody>
</table>
</body>
</html>"""

MOCK_QUIZ_INDEX_HTML = """<!DOCTYPE html>
<html>
<body>
<table class="generaltable">
<thead>
<tr><th>Tile</th><th>Name</th><th>Quiz closes</th><th>Grade</th></tr>
</thead>
<tbody>
<tr>
  <td>Meeting 1</td>
  <td><a href="https://kuliah.itk.ac.id/mod/quiz/view.php?id=469954">Vocabulary Practice 1</a></td>
  <td>No close date</td>
  <td>100.00/100.00</td>
</tr>
<tr>
  <td>Meeting 4</td>
  <td><a href="https://kuliah.itk.ac.id/mod/quiz/view.php?id=469843">Quiz 1 - Reading Assessment</a></td>
  <td>Jumat, 6 November 2026, 15:15</td>
  <td>-</td>
</tr>
</tbody>
</table>
</body>
</html>"""

class ItkCollectorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(self.temp.name)
        self.source = str(uuid.uuid4())
        self.store.enroll(self.source)

    def tearDown(self):
        self.store.db.close()
        self.temp.cleanup()

    def test_parse_itk_date(self):
        d1 = parse_itk_date("Kamis, 22 Oktober 2026, 11:00")
        self.assertEqual(d1['precision'], 'datetime')
        self.assertEqual(d1['local_datetime'], '2026-10-22T11:00:00')
        self.assertEqual(d1['timezone'], 'Asia/Makassar')

        d2 = parse_itk_date("22 Okt, 11:00", default_year=2026)
        self.assertEqual(d2['precision'], 'datetime')
        self.assertEqual(d2['local_datetime'], '2026-10-22T11:00:00')

        d3 = parse_itk_date("No close date")
        self.assertEqual(d3['precision'], 'unknown')
        self.assertIsNone(d3['local_datetime'])

        d4 = parse_itk_date("-")
        self.assertEqual(d4['precision'], 'unknown')

    def test_short_course_name(self):
        self.assertEqual(short_course_name("Algoritme dan Pemrograman - A2627"), "Alpro")
        self.assertEqual(short_course_name("Matematika Diskrit 1 - A2627"), "Matdis 1")
        self.assertEqual(short_course_name("Bahasa Inggris - A2627"), "Bahasa Inggris")

    def test_discover_courses_from_html(self):
        from unittest.mock import patch
        with patch('academic_os.itk.fetch_itk', return_value=MOCK_DASHBOARD_HTML):
            courses = discover_courses({'MoodleSession': 'dummy'})
            self.assertEqual(len(courses), 2)
            self.assertEqual(courses[0]['id'], '6869')
            self.assertEqual(courses[0]['short'], 'Alpro')
            self.assertEqual(courses[1]['id'], '7368')
            self.assertEqual(courses[1]['short'], 'Matdis 1')

    def test_fetch_course_items_from_html(self):
        from unittest.mock import patch
        course = {'id': '6869', 'name': 'Algoritme dan Pemrograman', 'short': 'Alpro'}
        def mock_fetch(url, *a, **kw):
            if 'mod/assign' in url: return MOCK_ASSIGN_INDEX_HTML
            if 'mod/quiz' in url: return MOCK_QUIZ_INDEX_HTML
            return ""

        with patch('academic_os.itk.fetch_itk', side_effect=mock_fetch):
            items = fetch_course_items(course, {'MoodleSession': 'dummy'})
            self.assertEqual(len(items), 4)

            # Check assign items
            a1 = next(i for i in items if i['id'] == 'itk-assign-480811')
            self.assertEqual(a1['title'], 'Tugas 1')
            self.assertTrue(a1['is_done'])
            self.assertEqual(a1['due']['local_datetime'], '2026-09-17T10:00:00')

            a2 = next(i for i in items if i['id'] == 'itk-assign-484750')
            self.assertEqual(a2['title'], 'Tugas 2 Praktikum')
            self.assertFalse(a2['is_done'])

            # Check quiz items
            q1 = next(i for i in items if i['id'] == 'itk-quiz-469954')
            self.assertEqual(q1['title'], 'Vocabulary Practice 1')
            self.assertEqual(q1['due']['precision'], 'unknown')
            self.assertTrue(q1['is_done'])

            q2 = next(i for i in items if i['id'] == 'itk-quiz-469843')
            self.assertEqual(q2['title'], 'Quiz 1 - Reading Assessment')
            self.assertEqual(q2['kind'], 'exam')
            self.assertFalse(q2['is_done'])
            self.assertEqual(q2['due']['local_datetime'], '2026-11-06T15:15:00')

    def test_import_itk_and_project_sync_envelope(self):
        from unittest.mock import patch
        mock_collected = {
            'courses': [{'id': '6869', 'name': 'Algoritme dan Pemrograman', 'short': 'Alpro'}],
            'items': [
                {
                    'id': 'itk-assign-484750',
                    'raw_id': '484750',
                    'kind': 'assignment',
                    'title': 'Tugas 2 Praktikum',
                    'course_id': '6869',
                    'course_name': 'Algoritme dan Pemrograman',
                    'course_short': 'Alpro',
                    'url': 'https://kuliah.itk.ac.id/mod/assign/view.php?id=484750',
                    'due_raw': 'Kamis, 22 Oktober 2026, 11:00',
                    'due': {'precision': 'datetime', 'local_date': None, 'local_datetime': '2026-10-22T11:00:00', 'timezone': 'Asia/Makassar'},
                    'submission_status': 'Belum mengajukan',
                    'is_done': False
                }
            ]
        }
        with patch('academic_os.itk.collect_itk', return_value=mock_collected):
            batches, summary = import_itk(self.store, self.source, cookies={'MoodleSession': 'dummy'})
            self.assertEqual(summary['tasks'], 1)
            self.assertEqual(len(batches), 1)

            # Verify projection into sync-envelope schema
            envelope = project(self.store, self.source, batches[0])
            self.assertEqual(envelope['schema_version'], '2.0')
            self.assertEqual(len(envelope['candidates']), 1)
            cand = envelope['candidates'][0]
            self.assertEqual(cand['fields']['title'], '[Alpro] Tugas 2 Praktikum')
            self.assertEqual(cand['fields']['due']['local_datetime'], '2026-10-22T11:00:00')

    def test_session_expired_fails_closed(self):
        from unittest.mock import patch, MagicMock
        mock_resp = MagicMock()
        mock_resp.geturl.return_value = 'https://kuliah.itk.ac.id/login/index.php'
        mock_resp.read.return_value = b'<html><title>Masuk ke situs</title></html>'
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = mock_resp
        with patch('academic_os.itk._open_portal', return_value=mock_cm):
            from academic_os.itk import fetch_itk
            with self.assertRaises(Invalid) as cm:
                fetch_itk('/my/', {'MoodleSession': 'expired'})
            self.assertEqual(str(cm.exception), 'SESSION_EXPIRED')



class ItkLocalIntegrationTests(unittest.TestCase):
    def setUp(self):
        from academic_os.pipeline import Pipeline
        from academic_os.pairing import Pairing
        from academic_os import itk_operations
        from unittest.mock import Mock
        self.tmp=tempfile.TemporaryDirectory();self.store=Store(self.tmp.name);self.source=str(uuid.uuid4())
        self.provider=Mock();self.uploader=Mock();self.status=Mock()
        self.pipeline=Pipeline(self.store,{},extractor=self.provider,uploader=self.uploader,status_checker=self.status)
        Pairing(self.store);itk_operations.action(self.pipeline,{'action':'enroll','source_id':self.source,'generation':'1'})
    def tearDown(self):self.store.db.close();self.tmp.cleanup()
    def selection(self,**values):return {'action':'preview','source_id':self.source,'generation':'1','session_cookie':'synthetic-cookie','profile_path':'','pending_only':'yes','confirmed':'yes',**values}
    def fetch(self,path,*args,**kwargs):
        if path=='/my/':return MOCK_DASHBOARD_HTML
        if '/mod/assign/' in path:return MOCK_ASSIGN_INDEX_HTML
        if '/mod/quiz/' in path:return MOCK_QUIZ_INDEX_HTML
        raise AssertionError('UNEXPECTED_SYNTHETIC_PATH')
    def test_full_local_preview_stages_review_without_cloud_or_provider(self):
        from academic_os import itk_operations
        from unittest.mock import patch
        with patch('academic_os.itk.fetch_itk',side_effect=self.fetch):value=itk_operations.action(self.pipeline,self.selection())
        self.assertEqual(value['kind'],'itk_lms');self.assertEqual(value['coverage'],'observed_pages_only');self.assertEqual(len(value['courses']),2)
        self.assertEqual(len(value['items']),2);self.assertGreater(len(value['jobs']),0)
        self.assertTrue(all(c['needs_review'] for j in value['jobs'] for c in j['payload']['envelope']['candidates']))
        job=value['jobs'][0];self.assertEqual(job['state'],'awaiting_projection_review');self.assertEqual(job['retry']['phase'],'local_lms')
        self.assertNotIn('synthetic-cookie',json.dumps(value));self.provider.assert_not_called();self.uploader.assert_not_called();self.status.assert_not_called()
        form={'action':'queue','source_id':self.source,'generation':'1','job_id':job['id'],'confirmed':'no'}
        with self.assertRaisesRegex(Invalid,'PROJECTION_REVIEW_REQUIRED'):itk_operations.action(self.pipeline,form)
        queued=itk_operations.action(self.pipeline,{**form,'confirmed':'yes'});self.assertFalse(queued['canonical_approval']);self.assertEqual(self.pipeline.get(job['id'])['state'],'sync_pending')
        self.assertNotIn(b'synthetic-cookie',(Path(self.tmp.name)/'evidence.sqlite').read_bytes())
    def test_session_input_generation_source_kind_and_preview_replay_boundaries(self):
        from academic_os import itk_operations
        from unittest.mock import patch
        for form,code in [(self.selection(confirmed='no'),'ITK_LOCAL_ACCESS_CONSENT_REQUIRED'),(self.selection(profile_path='/explicit/profile'),'ITK_SESSION_SELECTION_REQUIRED'),(self.selection(generation='2'),'SOURCE_GENERATION_CHANGED')]:
            with self.assertRaisesRegex(Invalid,code):itk_operations.action(self.pipeline,form)
        other=str(uuid.uuid4());self.store.enroll(other)
        with self.assertRaisesRegex(Invalid,'ITK_SOURCE_KIND_CONFLICT'):itk_operations.action(self.pipeline,self.selection(source_id=other))
        with patch('academic_os.itk.fetch_itk',side_effect=self.fetch):
            first=itk_operations.action(self.pipeline,self.selection());second=itk_operations.action(self.pipeline,self.selection())
        self.assertEqual([j['id'] for j in first['jobs']],[j['id'] for j in second['jobs']])
        with self.store.db:self.store.db.execute('UPDATE sources SET enabled=0 WHERE id=?',(self.source,))
        with self.assertRaisesRegex(Invalid,'SOURCE_REVOKED'):itk_operations.action(self.pipeline,self.selection())
    def test_ambiguous_year_markup_and_cross_origin_do_not_invent_data(self):
        from academic_os import itk
        from unittest.mock import patch
        self.assertEqual(parse_itk_date('22 Okt, 11:00')['precision'],'unknown')
        self.assertEqual(parse_itk_date('22 Oktober 2026')['precision'],'date_only')
        self.assertEqual(parse_itk_date('22 Oktober 2026, 11:00 or 23 Oktober 2026, 12:00')['precision'],'unknown')
        with patch('academic_os.itk.fetch_itk',return_value='<html>Unexpected theme</html>'):
            with self.assertRaisesRegex(Invalid,'ITK_MARKUP_CHANGED'):discover_courses({'MoodleSession':'synthetic'})
            with self.assertRaisesRegex(Invalid,'ITK_MARKUP_CHANGED'):fetch_course_items({'id':'1','name':'Synthetic','short':'Syn'},{'MoodleSession':'synthetic'})
        for url in ['https://kuliah.itk.ac.id.evil.invalid/my/','http://kuliah.itk.ac.id/my/','https://evil.invalid/my/']:
            with self.assertRaisesRegex(Invalid,'ITK_ORIGIN_INVALID'):itk.portal_url(url)
        import urllib.request
        with self.assertRaisesRegex(Invalid,'ITK_ORIGIN_INVALID'):itk.PortalRedirect().redirect_request(urllib.request.Request(itk.PORTAL),None,302,'',{},'https://evil.invalid')
        with self.assertRaisesRegex(Invalid,'ITK_COOKIE_INVALID'):itk.normalise_cookies({'MoodleSession':'bad\r\nHeader:value'})
    def test_cookie_profile_selection_uses_exact_host_only(self):
        from academic_os.itk import find_session
        import sqlite3
        profile=Path(self.tmp.name)/'firefox';profile.mkdir();db=sqlite3.connect(profile/'cookies.sqlite')
        db.execute('CREATE TABLE moz_cookies(name TEXT,value TEXT,host TEXT)');db.execute("INSERT INTO moz_cookies VALUES('MoodleSession','wrong-synthetic','kuliah.itk.ac.id.evil.invalid')");db.commit();db.close()
        with self.assertRaisesRegex(Invalid,'SESSION_NOT_FOUND'):find_session(str(profile))
        db=sqlite3.connect(profile/'cookies.sqlite');db.execute("INSERT INTO moz_cookies VALUES('MoodleSession','right-synthetic','.kuliah.itk.ac.id')");db.commit();db.close()
        self.assertEqual(find_session(str(profile)),{'MoodleSession':'right-synthetic'})
    def test_authenticated_http_ui_has_localized_errors_and_no_implicit_access(self):
        from academic_os.server import make_handler
        from academic_os import itk_operations
        from http.server import HTTPServer
        from unittest.mock import patch
        import secrets,threading,urllib.request,urllib.parse,urllib.error
        token=secrets.token_urlsafe(32);server=HTTPServer(('127.0.0.1',0),lambda *_:None);origin='http://127.0.0.1:'+str(server.server_port)
        with patch('academic_os.server.Pipeline',return_value=self.pipeline):server.RequestHandlerClass=make_handler(self.store,token,origin)
        t=threading.Thread(target=server.serve_forever,daemon=True);t.start()
        def request(path,form=None,cookie=None,site=origin):
            headers={'Origin':site,'Content-Type':'application/x-www-form-urlencoded'}
            if cookie:headers['Cookie']=cookie
            return urllib.request.urlopen(urllib.request.Request(origin+path,headers=headers,data=None if form is None else urllib.parse.urlencode(form).encode()),timeout=10)
        try:
            with self.assertRaises(urllib.error.HTTPError) as denied:request('/itk')
            self.assertEqual(denied.exception.code,401)
            login=urllib.request.Request(origin+'/login',data=json.dumps({'token':token}).encode(),headers={'Origin':origin,'Content-Type':'application/json'})
            with urllib.request.urlopen(login,timeout=10) as response:cookie=response.headers['Set-Cookie'].split(';')[0]
            with request('/itk?lang=en',cookie=cookie) as response:html=response.read().decode();self.assertIn('Collect local preview',html);self.assertNotIn('synthetic-cookie',html)
            with self.assertRaises(urllib.error.HTTPError):request('/itk/preview',self.selection(),cookie,'https://evil.invalid')
            for lang,phrase in [('id','Sesi Moodle kedaluwarsa'),('en','Moodle session expired')]:
                with patch('academic_os.itk.collect_itk',side_effect=Invalid('SESSION_EXPIRED')):
                    with self.assertRaises(urllib.error.HTTPError) as expired:request('/itk/preview',self.selection(lang=lang),cookie)
                body=expired.exception.read().decode();self.assertIn(phrase,body);self.assertNotIn('synthetic-cookie',body)
            with patch('academic_os.itk.fetch_itk',side_effect=self.fetch):
                with request('/itk/preview',self.selection(lang='en'),cookie) as response:html=response.read().decode();self.assertIn('Review structured projection',html);self.assertIn('Tugas',html)
            self.provider.assert_not_called();self.uploader.assert_not_called();self.status.assert_not_called()
        finally:server.shutdown();server.server_close();t.join()

if __name__ == '__main__':
    unittest.main()
