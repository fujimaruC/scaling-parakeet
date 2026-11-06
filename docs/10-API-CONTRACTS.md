# 10 — API, sync and state contracts

Version 0.2.0. Cloud prefix `/api/v1` remains route version; payload schema version is `2.0`. All private routes authenticate before data access. JSON responses carry request_id and server_time; errors contain sanitized code/message/retryable. No raw payload echo. Local raw receipt endpoints are separately specified in [15](15-PRIVATE-TRANSPORT.md).

## Scopes and routes

| Method/path | Scope | Request / response semantics |
|---|---|---|
| GET `/me` | owner | identity and non-secret preferences |
| GET/POST `/contexts` | owner | list/create academic/organization/personal context |
| PATCH `/contexts/:id` | owner | versioned edit/archive; no cascade task deletion |
| GET `/tasks` | owner | context/status/kind/date/priority filters; opaque cursor, limit 1–100 |
| POST `/tasks` | owner | manual fields + idempotency key; source manual assertion |
| GET/PATCH/DELETE `/tasks/:id` | owner | detail; If-Match edit/soft-delete; audit and reminder revision |
| GET `/candidates` | owner | review status/context filters, pagination |
| POST `/candidates/:id/review` | owner | expected candidate version, action, target task/version if update, owner edits, idempotency |
| GET `/search` | owner | bounded task search; escaped query <=200 chars |
| GET `/history` | owner | structured audit cursor; removed evidence suppressed |
| GET `/briefing` | owner | deterministic approved-task counts + pending count + freshness; selected local date |
| GET/POST `/sources` | owner | safe source aliases/context/enrollment; no raw file upload |
| PATCH `/sources/:id` | owner | expected version, pause/alias/context; never arbitrary upload permission |
| POST `/sources/:id/purge-preview` | owner | impacted records and permitted retain/delete choices |
| POST `/sources/:id/purge` | owner | expected generation/version, explicit choices, idempotency; new tombstone |
| GET `/sources/:id/purge-status` | owner | cloud completion and outstanding local device wipe acknowledgments |
| POST/DELETE `/collector-credentials[/:id]` | owner | create/revoke per-source sync credential; display secret once over protected setup |
| POST `/sync` | collector scoped source | strict v2 minimized batch only |
| GET `/sync/status?source_id=...` | same collector/source | current generation/pause/purge instructions only; no task read |
| POST `/sync/purge-ack` | same collector/source | Linux/device deletion acknowledgment, no raw content |
| GET `/reminders` | owner | intents/inbox/history with truthful processing/delivery state |
| POST `/reminders/:id/snooze` | owner | future UTC time, idempotency, task active check |
| PATCH `/reminders/:id/read` | owner | idempotent read acknowledgment |
| GET/PATCH `/settings` | owner | versioned UI/timezone/reminder policy; no router keys or source raw settings |
| POST/DELETE `/push/subscriptions[/:id]` | owner | register/revoke protected endpoint and keys |
| GET `/export?format=json|csv` | owner | bounded coherent canonical snapshot, schema version; no raw evidence |
| GET `/health` | owner | safe cloud + last-reported connector states |

Restore is an authenticated local administrative command against a disposable DB first, not a public restore upload endpoint. Scheduler is internal, no `/cron/run` in deployed API. Root route names in table are relative to `/api/v1`.

## Owner writes

Use `Idempotency-Key` UUID for creates/reviews/purge/snooze and `If-Match: "<version>"` for existing versioned entities. Wrong/missing version gives 409/428. Normalize request then scope idempotency by owner/endpoint; same key+same content replays original result, changed content returns 409. Task review request also includes expected_candidate_version and expected_task_version when targeting an existing task. Immutable user-supplied target IDs are checked for ownership, current state and relevance.

Review actions: `accept`, `accept_with_edits`, `reject`, `needs_clarification`, `manual_override`. Accept requires active evidence. Manual override explicitly creates an owner assertion and cannot label removed evidence verified. Unsupported non-task candidate kind requires owner-selected promotion kind. Collector cannot call review even with a schema-valid object. Candidate and task updates/event/reminders commit atomically with guarded CAS SQL; repeated approval cannot create two tasks.

## Cloud sync shape

`schemas/sync-envelope.schema.json` v2 is normative. Top-level schema_version/batch_id/source_id/source_generation/created_at/idempotency_key/coverage/items/candidates. One source/generation per batch. `items` carry preallocated opaque evidence IDs and safe timestamps only. `candidates` carry stable candidate UUID, expected_version (null for first creation), structured fields, issue codes, review-only status and evidence IDs. No `candidate_json` arbitrary object; no minimal_excerpt, raw hash, original expression, sender field, prompt or free-form model rationale.

Every candidate evidence ID must resolve to an item in the same batch; resend existing evidence refs as safe stubs on each related proposal batch. Cross-source canonical linking is a separate owner review, not a collector batch shortcut. Pending proposal updates require CAS; accepted proposals are immutable to collector, so new source changes create new proposals. One batch is atomic: any validation failure writes none. Cap <=100 items, <=50 candidates and <=256 KiB; reject excessive decoded size before expensive validation.

Server verifies credential source scope and current source generation/enrollment independently of supplied IDs. New source enrollment is owner action, never implicit creation from sync. Health updates carry no arbitrary text beyond enumerated sanitized error/issue codes. Unknown schema versions return 422; no permissive v1 fallback because v1 allowed excerpts.

## Authentication and retries

Collector uses verified service-auth where chosen plus application source-scoped HMAC. Canonical string is ASCII method uppercase, LF, exact pathname, LF, decimal UTC epoch seconds, LF, base64url nonce, LF, lowercase SHA256 body digest; no trailing LF. `/sync` has no query; reject noncanonical path. HMAC-SHA256 signature base64url, constant-time comparison. Keys from server-registered key ID; ±300s timestamp window; nonce scoped to key, retained >=10min. Body hash is over exact UTF-8 bytes. Digest of cloud body is allowed; digest of raw message text is not transmitted.

Retry keeps exact immutable body and idempotency key but uses fresh timestamp/nonce/signature. Request-auth replay is rejected; legitimate re-signed idempotent retry returns original committed result. Expired credential/purge generation does not become valid through idempotency replay. Store idempotency receipts minimum 30 days; durable evidence/candidate uniqueness and tombstones persist beyond receipt expiry.

## Error/status contract

401 auth required; 403 wrong scope/source; 409 version/idempotency conflict; 410 purged source generation/evidence; 413 oversize; 422 schema/semantic payload invalid; 428 missing version; 429 throttle with Retry-After; 503 quota/provider unavailable. Error codes: AUTH_REQUIRED, ACCESS_DENIED, INVALID_PAYLOAD, VERSION_CONFLICT, IDEMPOTENCY_CONFLICT, REPLAY_DETECTED, SOURCE_REVOKED, EVIDENCE_UNAVAILABLE, RATE_LIMITED, QUOTA_EXHAUSTED, INTERNAL_ERROR. Do not expose stack trace or offending message.

## Source state contract

Keep separate fields: configuration (`not_configured`,`configured`,`paused`), availability (`online`,`offline`,`blocked`,`unknown`), coverage (`export_window`,`partial_notification`,`calendar_window`,`manual`,`unknown`), verification (`unverified`,`device_tested`,`account_tested`), freshness computed from expected policy/last successful observation and sync. No single green state claims all dimensions. Unknown phone state is last-reported with timestamp, not guessed from cloud reachability.

## Reminder contract

Owner read API separates intent processing state from each delivery attempt. Snooze creates a new occurrence, not an edit to source deadline; completed/deleted tasks cannot snooze. Completion/deadline changes invalidate stale revisions. Provider accepted != delivered. In-app inbox unique intent_id prevents duplicate visible items even if external push outcome ambiguous.

## Contract tests

Anonymous read/write denied; collector cannot read owner tasks; phone cannot authenticate to cloud; owner cannot use collector sync; wrong source/removed generation rejected; schema extra field raw_text rejected; unknown evidence rejected; impossible date rejected; same batch idempotently replayed; changed body conflicts; race approval single task; partial D1 failure atomic rollback; >size/count limits denied; nonce replay denied but freshly signed same-body retry works; all errors contain no source text.

## S2 task read projection

Owner-authenticated GET `/tasks/:id?view=read[&history_before=<positive event id>]`
returns `task`, `history`, `next_history_cursor`, `sources` (active safe id/alias
only), `reminder_policy`, `reminder_policy_origin` and `timezone`. A transactional
D1 batch supplies this read snapshot. History is scoped to the existing undeleted
task, ordered by descending event ID, capped at 30 with one-row lookahead. Invalid
cursor is 422; missing/deleted task is 404; auth still precedes access. Normal GET
without `view=read` is unchanged. Migration 0005 adds only a history lookup index.
Configured policy or the scheduler's shared default is labeled explicitly; this
is not a claim that an intent was generated or delivered. No raw evidence field,
new write endpoint, registration or public personal-data route is added.
