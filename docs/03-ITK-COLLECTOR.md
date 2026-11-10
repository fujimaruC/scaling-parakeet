# ITK Moodle LMS Collector Specification & Architecture

**Target:** `https://kuliah.itk.ac.id` (ITK Moodle-based portal, Moodle 4.x with Moove theme and Tiles course format).
**Status:** Local collector and explicit /operations -> /itk UI implemented;
latest changes and new tests **NOT RUN** by owner instruction. Earlier mocked
parser test results are historical, not execution evidence for this source.
Real Moodle/session/profile behavior remains unverified. Cookies/profile paths,
HTML, source submission/grade status remain local. Structured task metadata and
opaque evidence references are staged for explicit projection review and separate
canonical owner approval. See [current owner procedure](next-scope/OWNER-VERIFY.md).

---

## 1. Explicit local session handoff

The UI requires either a pasted session cookie or one explicit Firefox profile directory. It never scans all profiles automatically. No browser automation runtime or extension is added.

- On Linux (Arch / system default), Firefox stores active session cookies in:
  `~/.config/mozilla/firefox/*.default-release/sessionstore-backups/recovery.jsonlz4`
- The collector loads the file, strips the 8-byte `mozLz40\0` header, and uncompresses the raw LZ4 block using the system's native `liblz4.so.1` via `ctypes`.
- Extracts active `MoodleSession` and `HASH_MoodleSession` cookies.
- Fallback path reads `cookies.sqlite` if recovery file is not present.
- All requests run via standard Python `urllib.request` with TLS verification enabled.
- If the session is missing or expired (redirected to `login/index.php`), the collector fails closed with `Invalid('SESSION_EXPIRED')` and does not crash or corrupt state.

---

## 2. Extraction & Discovery Strategy

### A. Course Discovery (`/my/`)
- Fetches the user dashboard (`https://kuliah.itk.ac.id/my/`).
- Discovers enrolled courses from `data-block="semester_sortierung"` (Semester overview) and active course links.
- Extracts `course_id`, full course name, and a normalized short abbreviation (e.g. `[Alpro]`, `[Matdis 1]`).

### B. Assignment Extraction (`/mod/assign/index.php?id=<cid>`)
- Queries Moodle's built-in assignment overview table for each course.
- Captures:
  - Activity ID (`id` from URL)
  - Title
  - Due date string and parsed `due` object (`precision: datetime`, `timezone: Asia/Makassar`)
  - Submission status (e.g. `Belum mengajukan`, `Terkirim dan siap dinilai`)
  - Direct activity URL (`https://kuliah.itk.ac.id/mod/assign/view.php?id=...`)

### C. Quiz Extraction (`/mod/quiz/index.php?id=<cid>`)
- Queries Moodle's built-in quiz overview table for each course.
- Captures:
  - Quiz ID and title
  - Closing date (`Quiz closes` or `No close date`)
  - Grade status (if graded, marked as done)
  - Direct quiz URL (`https://kuliah.itk.ac.id/mod/quiz/view.php?id=...`)

### D. Activity Filtering
- Tasks (`mod/assign`) and Quizzes (`mod/quiz`) are collected as tasks.
- Reading materials (`mod/resource`, `mod/page`), links (`mod/url`), and attendance (`mod/attendance`) are omitted from task generation to prevent cluttering the owner's task queue.
- `pending_only=True` (default) filters out completed or graded items.

---

## 3. Academic OS Schema & Sync Integration

### Evidence Storage (`Store`)
Raw observations are encrypted and saved into local SQLite `evidence` table via `Store.insert()` with an HMAC fingerprint of `['itk_lms', item_id, title, due_raw]`. No raw credentials or auth headers are ever stored.

### Candidate Generation (`ai-extraction.schema.json`)
Each item is transformed into an Academic OS proposal candidate:
- `draft_id`: `itk-{assign|quiz}-{id}`
- `fields.kind`: `'assignment'` (or `'exam'` for quizzes/midterms)
- `fields.title`: `[{course_short}] {title}` (max 240 chars)
- `fields.description`: Concise summary: `Tugas ITK ({url}) · {submission_status}` (max 500 chars)
- `fields.due`: Exact `local_datetime` in `Asia/Makassar` (WITA, UTC+8) or `precision: "unknown"`
- `fields.context_type`: `'academic'`
- `fields.assignee_scope`: `'owner'`
- `fields.priority`: `'normal'`
- `confidence`: `'high'`
- `source_decision_state`: `'confirmed_in_source'`
- `needs_review`: `True`

### Batching & Sync Envelope (`sync-envelope.schema.json`)
The candidate schema enforces `maxItems: 50` per extraction batch. `import_itk()` automatically chunks candidates into batches of 40 items. Each batch is validated and projected into `sync-envelope.schema.json` via `academic_os.sync.project()`, ready for upload to Cloudflare Worker `/api/v1/sync`.

---

## 4. Verification & Testing

- Unit tests in `collectors/local/tests/test_itk.py`:
  - `test_parse_itk_date`: Indonesian full & abbreviated date parsing into `Asia/Makassar`.
  - `test_short_course_name`: Normalization and acronym generation.
  - `test_discover_courses_from_html`: Course list extraction from synthetic dashboard HTML.
  - `test_fetch_course_items_from_html`: Table parsing for both assignments and quizzes.
  - `test_import_itk_and_project_sync_envelope`: Full pipeline validation into `Store` and `sync-envelope`.
  - `test_session_expired_fails_closed`: Fail-closed check when session is redirected to login.
- Test execution:
  ```bash
  .venv/bin/python -m unittest discover -s collectors/local/tests -v
  ```
  Result: 40 tests passed.

---

## 5. Usage

To inspect pending tasks from active Firefox session in terminal:
```bash
.venv/bin/python scripts/itk_sync.py
```

To include all tasks (including completed):
```bash
.venv/bin/python scripts/itk_sync.py --all
```

To sync to Academic OS backend:
```bash
export ACADEMIC_OS_API_URL="https://your-worker.workers.dev/api/v1"
export COLLECTOR_KEY_ID="your-key-id"
export COLLECTOR_HMAC_SECRET="your-secret"
.venv/bin/python scripts/itk_sync.py --upload --source-id "<source-uuid>"
```

## Current local integration contract — 2026-11-10

Enroll an explicit source UUID/generation as itk_lms before preview. Existing
untyped sources are not silently relabelled. Source kind is stored in a local
metadata table and must match the separately enrolled Worker source. Preview
performs authorized Moodle GETs only; it does not call AI or Academic OS cloud.
Cookie/profile inputs are never echoed or stored in jobs. Exact HTTPS portal
origin and redirects are checked before session forwarding; activity URLs retain
only numeric id, never sesskey. Sessionstore decompression and page sizes are capped.

Known overview tables are parsed by labelled deadline/status columns. Unsupported
markup/module absence is unavailable, not an empty successful collection. Ambiguous
yearless dates remain unknown instead of guessing a collection-time year. Source
completion status filters local preview only; it cannot mark a canonical task done.
Status/grades stay local and do not enter projected descriptions.

Evidence and proposals are encrypted locally. Unchanged repeated previews reuse
a staged job. Source+generation and evidence are checked again before review/
queue/send. A separate projection confirmation is mandatory; canonical approval
is still required in the task UI. No auto-upload collection mode remains in the
CLI. Current commands replace any historical --upload examples below/above:

```sh
.venv/bin/python scripts/itk_sync.py enroll --data-dir /private/aos --source-id SOURCE_UUID --generation 1
.venv/bin/python scripts/itk_sync.py preview --data-dir /private/aos --source-id SOURCE_UUID --generation 1 --profile /private/firefox-profile
.venv/bin/python scripts/itk_sync.py queue --data-dir /private/aos --source-id SOURCE_UUID --generation 1 --job JOB_UUID --confirm-projection
.venv/bin/python scripts/itk_sync.py send --data-dir /private/aos --source-id SOURCE_UUID --generation 1 --job JOB_UUID
```

Use --cookie-prompt instead of --profile to avoid cookies in shell history.
All synthetic UI/session/origin/markup/date/generation/projection cases are in
collectors/local/tests/test_itk.py; new cases are NOT RUN. Real portal variants,
Firefox permissions/locale and repeated live collection remain owner gates.
