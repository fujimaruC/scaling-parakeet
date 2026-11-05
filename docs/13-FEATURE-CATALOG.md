# 13 — Feature catalog and acceptance mapping

P0 = MVP required; P1 = conditional verified integration; P2 = later; R = research only. IDs remain stable across work packages and STATUS. Organization is a domain-wide requirement, not a tag-only optional feature.

| ID | Feature / user value | Priority / gate | Dependencies | Acceptance / failure |
|---|---|---|---|---|
| F01 | Single-owner identity, private API | P0 M0–M1 | account/auth proof | T01,T02; fail closed |
| F02 | Academic/organization contexts | P0 M1 | F01 | T03; org task without course |
| F03 | Manual task CRUD/date/status/priority | P0 M1 | F01,F02 | T04–T06; no offline fake save |
| F04 | Versioned task/audit/source history | P0 M1/M3 | F03 | T07,T15; lost-update 409 |
| F05 | Android permission/listener lifecycle | P0 M0/M2 | actual phone | T08; disconnected/unsupported visible |
| F06 | Selected-conversation filtering | P0 M0/M2 | F05 | T09; missing/colliding metadata skips raw |
| F07 | Encrypted bounded phone queue | P0 M0/M2 | F05,F06 | T10; overflow/expiry gap, no cloud backup |
| F08 | Private remote transfer/pairing/ack | P0 M0/M2 | F07, Linux | T11,T12; queues while laptop off |
| F09 | Linux export import + browser preview/history | P0 M2 | source enrollment | T13; unsupported format warning |
| F10 | Shared normalization, dedupe, backfill | P0 M2 | F08,F09 | T14; ambiguous link reviewed |
| F11 | Local evidence + cloud structured projection | P0 M2/M3 | F10 | T16; quote stays local |
| F12 | 9Router consent/validation/extraction | P0 M3 | F10,F11 | T17,T18; no-provider fallback |
| F13 | Review/edit/reject/clarify/approve proposals | P0 M3 | F03,F11,F12 | T15,T19; every AI task owner-approved |
| F14 | Conflicting deadline reconciliation | P0 M3 | F04,F13 | T20; preserve sources, no silent overwrite |
| F15 | Today, unified task list and calendar | P0 M4 | F03,F13 | T21; unknown due separate |
| F16 | Search and task history | P0 M4 | F03,F04 | T22; bounded/escaped queries |
| F17 | Deterministic daily overview | P0 M4 | F03 | T23; independent of AI |
| F18 | Cloud scheduler/inbox/reminder policy/snooze | P0 M4 | F03,F04 | T24,T25; laptop-off, dedupe |
| F19 | Web Push feasibility + fallback | P0 M4 | F18, actual browser | T26; unsupported declared, inbox remains |
| F20 | Offline PWA/read snapshot/logout wipe | P0 M4 | F15 | T27; no offline writes |
| F21 | Source health/freshness/gaps | P0 M2/M4 | F05–F12 | T28; last-reported states distinguished |
| F22 | ID/EN, light/dark, accessible mobile UI | P0 M1/M4 | UI surfaces | T29; 360px/text 200%/keyboard |
| F23 | Canonical export/encrypted restore | P0 M4 | all cloud entities | T30; no raw export archives/keys |
| F24 | Task/source purge + offline acknowledgments | P0 M2/M4 | F04,F08,F11 | T31; no resurrection |
| F25 | Operational budgets/health/recovery | P0 M0/M4 | all | T32,T33; no unapproved charge |
| F26 | ITK calendar/authorized data source | P1 M5 | evidence + F10,F14 | T34; manual fallback |
| F27 | Linked-device/Baileys comparison | R M0 | primary docs | written go/no-go options only; no enrollment |
| F28 | Subtasks/recurrence/study planning | P2 later | separate scope decision | not required for MVP |
| F29 | Group recaps/searchable decisions | P2 later | privacy + storage ADR | not implemented by generic AI summary passthrough |
| F30 | Offline edit queue | P2 later | reconciliation design | disabled in MVP |

## Cross-feature rules

- F05–F10 are two acquisition adapters to one evidence pipeline; no two independent task stores.
- F11 permits structured unapproved proposals, not raw source quotes. F13 approval is mandatory for canonical AI output.
- F19 required feasibility/device result may end as explicitly unsupported push; F18 inbox/reminder engine still required. F05 listener cannot be waived this way: both acquisition methods were confirmed MVP.
- M4 includes privacy/backup/accessibility baseline; later hardening cannot excuse their absence.
- F26 never claims ITK capability from generic Moodle documentation alone.
