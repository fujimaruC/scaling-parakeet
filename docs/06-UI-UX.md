# 06 — Interface and user journeys

Responsive PWA is the primary product. Companion UI is limited to collection/setup/status. Local browser UI makes import, evidence and AI consent usable without terminal commands. Clean, restrained color, list-first layouts; no generic dashboard grids or decorative chat bubbles.

## Screen and route contract

| Route / surface | Main content and actions | Required empty/error state |
|---|---|---|
| `/` Today | Overdue, due soon, next commitments, review count, changes, daily overview | No sources → quick-add; stale sources clearly marked |
| `/tasks` | Academic/organization/context/status filters, no-date section, search entry, quick-add | Loading, empty filters, read-only offline |
| `/tasks/:id` | Due precision, status, evidence refs, owner confirmation, event history, edit/complete/archive | Conflict 409 with reload/compare; removed evidence label |
| `/review` | Pending/clarification proposals, proposed fields, evidence availability, issue codes | No hidden auto-accept, stale candidates refresh |
| `/review/:id` | Accept/edit/reject/clarify; target task and before/after conflict comparison | Missing evidence/manual override choice; failed write stays unsaved |
| `/calendar` | Month + list toggle, context filters, timed vs all-day rows | Unknown dates remain in no-date list, not today |
| `/search` | Title/description/context matching, bounded results | Search unavailable offline unless explicitly snapshot-only |
| `/history` | Task changes and review actions, cursor pagination | Deleted evidence unavailable rather than placeholder quotation |
| `/sources` | Listener, transfer, Linux, exports, AI and cloud health separately | Laptop-off != phone collection stopped; uncertain mapping shown |
| `/settings` | Identity, ID/EN, theme, timezone, reminders, privacy projection, exports/purge | Local-only settings link tells owner Linux connection is required |
| Local `/imports` | Linux file picker, source/timezone, parse preview, import history | Unsupported format, oversized file, wrong group, canceled import |
| Local `/evidence/:id` | Local source context and timestamps, retention state | Never upload quote to satisfy phone request |
| Local `/processing` | Redaction preview, provider/route consent, queued batches | No provider/route verification → AI disabled |
| Android companion | Permission, selected conversations, queue counts, pairing, errors, pause/wipe | Missing metadata, disconnected listener, revoked pairing, queue overflow |

## Navigation and design tokens

Phone bottom navigation: Today, Tasks, Review, Calendar. Menu includes search, sources, history, settings. Desktop slim sidebar. Both academic and organizational contexts appear in the same flow with accessible labeled filters.

Proposed visual baseline: neutral surfaces, teal primary action, amber uncertainty, red critical due/error; labels/icons supplement color. System font, body 16px+, 44px controls, visible focus, clear 8px spacing rhythm, restrained 12px corner radius. Light/dark contrast target WCAG AA; respect reduced motion. Avoid card grids for long task lists. All visible text uses translation keys; Indonesian default suggested, owner can choose English. Store preference, do not infer language from message content.

## Review details

Task title, context, date precision, assignee scope, source timestamp, issue codes and evidence availability are visible before approval. If source is Linux-local, say “Original message available on your Linux device.” No fake quotation or paraphrase presented as original evidence. For deadline conflict, show canonical due and proposed due with explicit accept-change action. One candidate at a time in MVP; no blanket approval that conceals conflicts. Accept button disabled while saving; lost response retries same idempotency key.

User edits can rescue an unclear proposal. If evidence is purged, allow explicit manual task creation after acknowledging missing evidence; do not mark AI evidence verified. Review audit records edits and manual override. Source confirmation and user approval are separately labeled.

## Quick add and task completion

Title required; context optional; choose academic/organization/personal through context. Deadline defaults unknown; selecting only a date stays date-only. Priority normal. Save success only after server acknowledgment. Completion atomically cancels pending reminders. Offline edits are disabled with explanation and existing snapshot remains readable.

## Attention design

Briefing uses approved tasks and counts of pending proposals; no speculative deadline in the approved-task total. Suggested briefing 07:00 is editable. In-app inbox records reminders independently of push permission. Generic lock-screen payload by default. Snooze shows exact next reminder time, muting shows disabled state. No repetitive overdue spam by default.

## Privacy and accessibility checks

Authenticated data is not embedded in static assets. Static shell cache excludes auth pages. IndexedDB contains only owner-scoped structured snapshot; logout clears it even if network logout fails. Show cached timestamp. Local evidence browser responses are no-store and never routed through the cloud PWA service worker.

Test 360px phone, wide desktop, both languages/themes, keyboard, screen-reader names, text 200%, long Indonesian/Arabic labels, offline, empty, loading, conflict, permission denied and source unavailable. Real Android browser is required for install/push claims.
