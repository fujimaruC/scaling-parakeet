# 02 — Data model, identity and reconciliation

Version 0.2.0. Opaque UUIDs, UTC instants for events, IANA source timezone and explicit precision for deadlines. SQLite locally and D1 in cloud; raw/evidence payloads never share a cloud table.

## Cloud entities

| Table | Required semantics / fields |
|---|---|
| `contexts` | id, type academic/organization/personal, safe display_name, semester?, archived_at, version; organizations never need course_id |
| `sources` | id, context_id?, kind, safe alias, allowlisted, generation, configuration_state, availability, coverage_kind, verification_state, freshness timestamps, version, purged_at |
| `source_items` | id (preallocated opaque evidence ID), source_id, generation, observed_at, source_message_at?, local_evidence_available, removed_at; NO quote/body/sender/raw hash |
| `source_item_observations` | id, source_item_id, import_id opaque, kind, observed_at; provenance without full transcript |
| `sync_runs` | id, source_id, received_at, counts, coverage window, sanitized codes; no payload logs |
| `candidates` | id stable local proposal ID, source_id, generation, kind, context_id?, structured proposal, review_status, version, extraction_revision, issue_codes, created_at, updated_at, removed_at |
| `candidate_evidence` | candidate_id, source_item_id, role; evidence must belong to same owner and permitted source generation |
| `assertions` | id, source_item_id, task_id?, candidate_id?, field, typed_value, source_role, observed_at, revoked_at; source assertion is not owner confirmation |
| `tasks` | id, context_id?, kind, title, description?, status, priority, due_precision, due_local_date?, due_local_datetime?, timezone?, due_at_utc?, version, due_revision, manual_lock_fields, created_at, updated_at, archived_at, deleted_at |
| `task_evidence` | task_id, source_item_id, approval_event_id; multiple independent supporting sources possible |
| `review_actions` | id, candidate_id, action, actor owner, candidate_version, target_task_id?, task_version?, normalized_patch, idempotency_key, acted_at |
| `task_events` | id, task_id, actor owner/system, type, before/after structured fields, review_action_id?, source_refs, timestamp; never raw quotes |
| `reminder_rules` | id, enabled, kind, timing, quiet_hours, version |
| `reminder_intents` | id, task_id?, rule_id, due_revision?, scheduled_for_utc, state, lease_token?, lease_until?, attempt_count, dedupe_key unique |
| `notification_inbox` | id, intent_id unique, safe message, task_id?, created_at, read_at?, snoozed_until? |
| `delivery_attempts` | id, intent_id, subscription_id, attempt, state, error_code, attempted_at, provider_accepted_at?, acknowledged_at? |
| `push_subscriptions` | id, protected endpoint/keys, device label, revoked_at, created_at; excluded from portable backups |
| `idempotency_records` | credential/owner scope, key, normalized request digest, result reference, expires_at; no raw request retained |
| `replay_nonces` | credential_id, nonce unique, expires_at |
| `source_tombstones` | source_id, revoked_generation, purged_at; stale batches rejected permanently for revoked generation |
| `settings` | timezone, language, theme, reminder/retention policies, last_seen_event_cursor, version |

Candidate status: pending / needs_clarification / accepted / rejected / withdrawn. Every candidate has a version. Only owner can accept/reject; collector may withdraw unsupported pending proposals with an audit trail but cannot overwrite accepted decisions. Announcement/decision candidates can be dismissed or explicitly promoted to an appropriate task/event; persistent recap/decision archive is later.

## Local-only entities

- Phone: paired_device config and protected keys; immutable capture_events with encrypted eligible payload, callback/source timestamps, nullable identity fields, queue state/attempts; receipt journal; sanitized collection gaps; local allowlist mappings.
- Linux: devices, receipts, imports, raw-file paths, encrypted raw notifications, normalized messages, source lineage, candidate extraction runs, external-processing consent receipts, extraction cache and outbound cloud batches.
- Map original sender to local pseudonym only when relevant. Cloud never receives sender directory or raw-content hash. Evidence IDs are random UUIDs allocated once and persisted locally before cloud sync.
- Local message fingerprints use keyed hashes with locally managed secrets. They never become cloud IDs. Track occurrence/neighbor context for repeated identical export messages; timestamp+body alone is not sufficient.

## Date invariants

| Precision | Stored value | Scheduler |
|---|---|---|
| datetime | validated local_datetime + IANA timezone + derived UTC; local_date null | exact reminder rules |
| date_only | valid local_date; local_datetime/UTC null; timezone selected | separate policy generates reminder instant, not due time |
| approximate | all machine-date fields null; ambiguity code, local evidence retains expression | no deadline reminder |
| unknown | all date/time fields null | no deadline reminder |

Exact local timestamps use `YYYY-MM-DDTHH:mm:ss` without offset plus IANA timezone. Resolve DST gaps/overlaps explicitly; require owner clarification if ambiguous. Date-only uses YYYY-MM-DD with real calendar validation. Display source timezone when it differs from owner settings. Task edit changing due or completion state increments due_revision and invalidates previous pending/leased reminders in the same transaction.

## Deduplication and revisions

1. Android callback identity: device + notification key + normalized eligible payload revision; persist an event UUID. Repeated same payload is deduped. Group summaries are health signals, not fabricated messages. Source timestamp and OS post time remain distinct.
2. Export import identity: allowlisted conversation + file digest locally; message fingerprint includes time precision, sender alias, normalized text and occurrence context. Normalize line endings but preserve semantic edits.
3. Cross-source links: same validated conversation and corroborating timestamp/text/context can link evidence. Truncated, ambiguous or repeated messages remain separate with possible_duplicate; never fuzzy-merge canonical tasks.
4. Extraction identity: local evidence set + extractor/prompt/schema/route version generates local cache key. Persist stable candidate UUID; reimport/retry uses it. New extraction revisions update pending candidates with expected version, or create a change proposal for accepted tasks.
5. No source disappearance implies task completion/deletion. No notification removal implies message deletion. Store observation changes separately.

## Atomic mutations

Approval requires current candidate version, evidence still active, and current target task version if updating. In one D1 atomic batch: conditional approval, task write, evidence links, review action, task event, reminder invalidation/new intents, idempotency result. All dependent SQL is guarded by successful compare-and-swap; a zero-row CAS is not a SQL error, so it must not allow later unconditional writes. Test concurrent approvals and stale task updates. Never hold a transaction across external I/O.

## Purge and restore

Purge is preview→owner decision→generation revocation. Owner selects retain-as-manual or delete for tasks solely supported by that source. Multi-source/manual tasks survive with removed links. Pending proposals withdraw. Scrub evidence and source-derived values from retained audit records as required, retaining a minimal deletion event. Revoke source-specific credentials, reject stale queue generations and require explicit new enrollment for future capture.

Cloud cannot erase offline phone/Linux immediately: record pending device deletion acknowledgments. On reconnection sync tombstones before ingest and purge applicable raw queues/evidence. Do not label global deletion complete before device confirmations. Removing a source must remove derived cache snapshots on next authenticated refresh; logout always clears local PWA private cache.

Canonical backup includes schema version, contexts, tasks, approved source metadata, review history, tombstones, settings and pending structured proposals (explicitly selected). Exclude raw evidence, credentials and push endpoints. Restore to a disposable database; compare normalized content hashes/counts, preserve tombstones, regenerate future reminder intents, suppress all dispatch until verification. Backups with old deleted data need rotation; do not resurrect task state via restoring delivery attempts.

## Index and resource plan

Index tasks(context_id,status,due_at_utc), tasks(updated_at), reminder_intents(state,scheduled_for_utc), candidates(review_status,updated_at), evidence(source_id,generation), sync received time. Date-only sorting requires a separate local-date index/normalized query, not false UTC conversion. Search starts with escaped, bounded SQL matching and context/status filters; assess FTS only when measured. Paginate all histories and source lists.

## S3–S7 review compensation storage (migration 0006)

`review_effects` keys an owner decision by action_id and records candidate/source
identity and generation, the post-decision versions, prior candidate status,
optional target task/version, a new-task flag, structured pre-task fields and
prior opaque evidence links. undone_by and undo_blocked fence compensation.
No original evidence, raw quotation, original date expression or message hash is
stored. Existing review_actions/task_events remain the audit. Compensation uses
one guarded batch, advances versions/revisions, restores prior evidence only if
still active, and schedules future reminders only. Later edits/source purge block
undo. A new-task undo is a soft deletion, with historical evidence retained for
future source purge. Purge scrubs inverse snapshots and conservatively removes
history payloads of affected reviewed tasks while preserving event metadata.

Inverse records are deliberately absent from export/portable restore. The shipped
backup reader continues using the established canonical table allowlist; do not
add inverse snapshots to a backup or re-enable them after restore. A restored
historical action has no current Undo capability. Migration also indexes pending
candidate cursors and literal date-only lookup. Application of this migration
and all behavioral invariants are unverified in this build-only session.
