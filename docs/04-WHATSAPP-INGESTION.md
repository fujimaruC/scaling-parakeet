# 04 — Unified WhatsApp ingestion

Both paths are MVP. The listener reduces routine exporting; exports backfill available context. Neither proves complete WhatsApp coverage. See [Android](14-ANDROID-COMPANION.md) for device behavior and [transport](15-PRIVATE-TRANSPORT.md) for raw-content transfer.

## Shared pipeline

Source enrollment → permitted capture/import → local evidence IDs → normalization → conservative dedupe/linking → local privacy preview → optional approved AI processing → strict structured projection → cloud proposal → owner review → task/reminder.

A conversation can feed both paths under one owner-approved logical source mapping. Keep connector identity and coverage per path. Never infer group identity solely from filename, display name or notification title. Owner maps ambiguous aliases locally; unavailable identity means skip content and report a gap.

## Export importer

Guided Linux-local browser flow: select an existing `.txt` export → select enrolled conversation → select date locale/timezone → preview detected boundaries and warnings → choose range/exclusions → parse locally → optional extraction → show cloud projection before sync. Daily use must not require CLI. No cloud file-upload endpoint. Do not add phone export storage to the companion; user transfers directly to Linux outside cloud storage.

Parse UTF-8/BOM, explicitly supported locale headers, 12/24-hour formats, multiline text and system notices. Preserve original message time and parsing certainty. Malformed dates, missing years, header-like body lines, media/deleted placeholders and partial exports produce warning codes. File limit proposed 25 MiB, stream in bounded chunks; show actionable error rather than silently truncate. Test 20k synthetic messages without pretending that is the owner's actual volume.

Store local imports with source, selected range, observed bounds, count, failures and dedupe outcomes. Cloud stores sanitized import history, not file path/name if it reveals private content. The label `export_window` describes observed material, not complete history.

## Listener path

Explicit Android notification access plus per-conversation enrollment. Package filtering first, metadata matching second, body persistence only for eligible records. Read structured MessagingStyle messages where actually provided; fallback fields may be incomplete. Every callback is an observation, not necessarily a new message. Summary-only, hidden previews and absent sender/time are not reconstructed.

Listener is local-first and can queue while Linux is off. On reconnect, inspect still-active notifications after service connection; this can reconcile outstanding notifications, not recover history that vanished. Device-specific behavior and missing/muted notifications remain visible.

## Merge rules

- Repeated import of same file: zero new normalized evidence/proposals.
- Overlapping files: context-aware identity; ambiguous repeat creates review flag rather than dropping content.
- Notification plus export: enrich local evidence after a strong match; preserve both observation methods and provenance.
- Truncated preview matching several messages: do not auto-merge.
- Edited source: new revision/assertion; accepted task unchanged until a new owner decision.
- Event deletion/removal: do not infer task canceled or chat message deleted.
- Assignment ownership: distinguish owner/class/group/other/unknown. Organization title is not course metadata. Instructor formal due and group internal due remain separate claims.

## Coverage UI vocabulary

`Collected: 12 eligible notification events` is valid. `Missed: 8 messages` requires independent known truth and is usually unavailable. Display `possible gap`, interval/reason, queue delay, last receipt, last export window and last extraction. Export does not automatically clear a gap; note overlapping observed context and remaining uncertainty.

## Alternative research

The owner authorized a Baileys/linked-device **research spike only**. Produce an ADR comparing metadata/history access, local storage, maintenance, permitted use, account/session exposure, reconnect behavior and privacy compatibility. No account linking, runtime adapter or third-path implementation is in the approved baseline. Do not treat a library's existence as account-specific reliability evidence. No requirement for evading restrictions or bypassing hidden previews/group controls.

## Acceptance

Selected and unselected conversations, duplicate callbacks, synthetic exports, multiline/system notices, time ambiguity, backfill, no-provider mode, repeat extraction and purge-generation rejection all pass. D1/logs contain no raw quotations. Actual device proof is mandatory; exports remain usable if listener is disabled or unavailable.
