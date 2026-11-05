# 03 — ITK MOODLE INTEGRATION

**Target:** `https://kuliah.itk.ac.id` (ITK Moodle-based academic portal). **Institution-specific integration status: UNVERIFIED.** No administrator cooperation assumed, and no account credentials are required in the repository.

## 1. Outcome
Capture course name, assignment title/instructions, due date with precision/timezone, course link, submission status where visible, and update timestamp **only if legitimately available** in the user's account. Preserve source provenance and show fresh/stale status.

## 2. Ordered feasibility ladder

| Order | Approach | Probe | Failure fallback |
|---|---|---|---|
| 1 | Manual task entry | User can enter a task with source link and date | Always available |
| 2 | Calendar `.ics` export or subscribed feed | Check Moodle Calendar > Export calendar while signed in; do not expose token URL | Manual `.ics` import |
| 3 | Existing student-visible Moodle API | Test documented, authorized capabilities only and permissions granted to user's account | Browser-assisted read |
| 4 | Extension/on-demand browser collection | Collect task DOM from owner-visible pages during an authenticated normal session, respecting site rules | Manual entry |
| 5 | Headless scheduled Playwright on laptop | Only if allowed, stable and no access-control bypass needed; sessions kept local | Scheduled user-assisted sync |

Order 1 is functional MVP fallback; orders 2–5 are evidence-dependent enhancements. University-specific availability must be recorded in `STATUS.md` with sanitized observation, not guessed from Moodle documentation.

## 3. Feasibility protocol (no IT contact needed)
1. Sign in normally using the user's browser. Inspect navigation for Calendar / Export calendar (no password/token sharing).
2. Inspect visible course pages for assignment due dates, notifications, activities and official submission links.
3. Determine whether `.ics` feed provides sufficient coverage; note scope (courses vs all events) and time-window limits.
4. If there is a mobile app/API feature, use only user-authorized functionality. Moodle APIs may require administrator-enabled web services; never assume token issuance is allowed.
5. Record one non-sensitive example of field coverage: title, course, due precision, changed timestamp, link. Sanitize personal details.
6. Test a repeated import and an updated deadline; verify idempotency and source assertion change.
7. Check site rules, robots/policies applicable to automation, rate limits and session security. Stop if blocked or forbidden; no bypass.

## 4. iCalendar importer contract
- Accept `.ics` file (UTF-8 and standard line folding); support VEVENT UID, DTSTART, DTEND, SUMMARY, DESCRIPTION and URL where present.
- Distinguish all-day events from exact timestamps. Respect TZID, local floating time and timezone ambiguity; do not silently use laptop system timezone for all dates.
- Track `UID` and recurrence (`RRULE`, `RECURRENCE-ID`) or mark unsupported occurrences for review.
- Do not assume every Moodle event is an assignment; classification `assignment`, `exam`, `meeting`, `other`, `unknown` with source tag.
- Tokenized feed URL is a bearer secret. If calendar subscription is enabled, store URL only in an encrypted collector/local secret location unless explicit audited cloud sync is approved.
- Calendar exports can have limited past/future windows. Show actual window and `coverage_quality=calendar_window`.

## 5. Browser-assisted collector contract
- Runs only during owner-authorized session on Arch; login remains in normal browser profile and credentials are never parsed into app settings.
- Prefer explicit `Sync this course` button over covert page monitoring. Parse visible information with selectors isolated per site version.
- DOM content is untrusted; sanitize HTML and links; never evaluate page-provided script beyond browser's normal rendering.
- Capture minimal task fields, source URL, and `observed_at`; mark empty/missing information as unknown.
- Avoid rapid requests; pause on failed auth, CAPTCHA, MFA, network block or unusual error. Do not attempt to circumvent challenges.
- Maintain a **fixture-driven selector compatibility test** from anonymized HTML; real layout can change without warning.

## 6. Reconciliation
- LMS `source_assertions` refer to formal submission info but do not automatically supersede an owner-confirmed changed deadline.
- For missing assignments in one poll, mark `not_seen_in_latest_sync` rather than delete; an exported date window is not comprehensive.
- New/changed Moodle assertion may trigger a candidate for review. Show precise source URL and observation time.
- Submission status, if visible, may be imported but should never auto-mark task `done` without corroboration or owner decision.

## 7. Error and availability states
`NOT_CONFIGURED`, `CALENDAR_DISABLED`, `FEED_EXPIRED`, `MFA_REQUIRED`, `SESSION_EXPIRED`, `RATE_LIMITED`, `PARSE_LAYOUT_CHANGED`, `NETWORK_UNAVAILABLE`, `PERMISSION_DENIED`, `SYNC_PARTIAL`. Do not dump page HTML/cookies into cloud logs.

## 8. Definition of integration done
- A one-course, authorized source fixture yields correct title, URL, course, date and exact/unknown precision.
- Reprocessing same data makes no duplicate task/candidate.
- Timezone conversion is verified against Asia/Makassar cases.
- Expired sessions and changes in page structure show accurate `stale/blocked` states.
- Manual entry remains available when all automatic methods are unavailable.

**References:** see `12-SOURCES.md` for Moodle Calendar and web-service admin documentation. Platform capability is not proof of ITK configuration.
