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
        with patch('urllib.request.urlopen', return_value=mock_cm):
            from academic_os.itk import fetch_itk
            with self.assertRaises(Invalid) as cm:
                fetch_itk('/my/', {'MoodleSession': 'expired'})
            self.assertEqual(str(cm.exception), 'SESSION_EXPIRED')

if __name__ == '__main__':
    unittest.main()
