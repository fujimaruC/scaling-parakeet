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

The owner-supplied [design contract](design/UI-DESIGN-AGENT.md) and unchanged
[synthetic reference](design/reference/app.html) supersede the former proposed
teal/rounded/system-font appearance. See ADR-021 for reconciliation.

S1 foundation: warm paper/ink surfaces, square borders, hard shadows, local
Pixelify Sans headings/controls and Inter body, decorative bitmap icons, dotted
background. Four fixed bottom tabs on phone and desktop, with a centered 430px
column. Existing sources/history/reminders/settings remain accessible through the
labeled page selector; task search remains in the list toolbar. System/light/dark
preference persists locally and system mode responds to OS changes. Quick-add
floating button appears on Today/Tasks/Calendar only, disabled offline/busy.
Native tasks and private-source content boundaries do not change.

The development-only `/__kit` showcases Box/Chip/Tag/Button/Bitmap/UrgencyBar;
production never routes to that kit. Precise-instant urgency has sixteen
segments, is decorative, and is withheld for date-only/approximate/unknown due
values. It is a primitive pending real screen integration in S2.

S2–S7 are not implemented by S1: detailed reference layouts/grouping, history-based
routing/sheets, swipe/keyboard decisions, compensating undo, shared visible ticker,
full translations, calendar redesign and the full accessibility audit remain due.
Existing real-data views and approval flows remain operational under the new shell.
Write success follows server acknowledgment; no optimistic success or snapshot
rollback can erase history. Source-generation and version conflicts must remain
visible. New libraries are unnecessary for this foundation.

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

## S2 read-only screen contract

S1 is owner-accepted. S2 adds `/today` (with `/` alias), `/tasks` and
`/tasks/:id`; tabs, detail and `?sheet=date|quick` are real history entries. Back
closes a sheet before detail; a direct detail link returns to Tasks. Utilities and
legacy pages remain reachable in the labeled Tools disclosure. Today has the
pixel date/header/chips, aggregate proposal banner, due/overdue cards, next-seven-
calendar-day rows and an always-present no-date navigation row, even at zero.
Tasks has context filters and ordered Today/This week/Later/No date/Done groups.
Empty groups are hidden. Dated completed tasks retain precision labels in Done;
approximate/unknown dates remain distinct under no confirmed date even when
completed, preserving the owner's always-under-Tanpa-tanggal requirement.

Task rows have real labeled buttons, 44px hit areas around 24px boxes, context
labels alongside colors, readable completed text, and pixel when labels. Detail
shows the four precisions, actual effective policy with origin and no delivery
claim, notes, and newest-event-ID-first task-scoped history with earlier-page
loading. Missing metadata is unavailable. Data errors do not manufacture empty
history, a precise date, or a reminder rule. Offline detail identifies its cached
snapshot and leaves history/policy unavailable.

S2 completion/add/save are disabled. Date and quick-add sheets preview fields;
the precision selector distinguishes exact/date-only/approximate/unknown. No S3
write or undo is implemented. Existing legacy write flows remain available outside
these new read-only surfaces. Native dialogs handle modality with explicit
aria-modal, focus trapping/return, Escape, backdrop and browser Back. A polite
informational toast is not a save-success acknowledgment. One shared clock updates
visible countdowns every 30 seconds and on return from background.

Dates use the owner's saved timezone for grouping and the stored source timezone
for exact/date-only labels. No timestamp is fabricated for date-only or uncertain
dates. Partial pages explicitly qualify counts/groups/filters; the no-date row
labels its loaded count. Banner/badge use aggregate pending count. This does not
complete large-ledger pagination or the later Calendar redesign. Original visual
reference is unchanged; readonly explanations and a precision selector are
intentional differences. Android identity, full accessibility and actual-device
capture validation remain open.

S2 exact deadlines sort by UTC instant within their owner-calendar day, including
repeated wall-clock hours at DST rollback. A failed older-history page preserves
the known detail/events and offers retry with an explicit history error. Informational
toasts are nonblocking; S2 supplies no toast mutation or undo action.

## S3–S7 implemented continuation; verification delegated

Owner authorization now permits all five slices in one implementation session
without intermediate review stops. S2-only disabled controls/previews above are
historical: current ledger completion, quick-add and precision sheets call the
real versioned Worker. Full task editing remains reachable from detail. Unknown
and approximate remain distinct; neither is coerced into a machine deadline.
Pending completion shows an optimistic check only; groups/counts remain canonical.
An explicit online request is journaled before send. Unknown responses expose a
same-key retry; new/offline writes remain blocked. Closing a sheet does not delete
its pending request. Do not submit a replacement for an uncertain create.

Review uses a real pending candidate page, stack, pointer threshold/vertical
cancellation, native buttons and non-repeating unmodified arrow-key equivalents.
Date edits stay a draft until explicit acceptance. Issues/non-task kinds require
an edited approval. Conflict target selection is explicit, searchable and paged;
no automatic fuzzy target is chosen. Only active opaque evidence IDs and safe
source aliases appear. Missing evidence blocks acceptance. Accept/reject can show
a 4.5-second Undo button; compensation appends audit and checks server versions.
Rejection without a known target is a candidate audit, not an invented task event.

Calendar uses the owner's timezone, Monday-first day buttons, selected-day rows,
up to three undone context squares and a permanent no-date link. A partial month
qualifies all dots/counts; load-more is explicit. New month/day selections are URL
history entries. Tasks context/title searches now query beyond the global first
page, with independent cursors and honest loading/unavailable states.

Settings adds browser-local ID/EN/system/light/dark, versioned owner timezone,
existing reminder rules, structured export, Linux encryption/restore instructions,
and source purge/acknowledgment entry points. Purge is preview plus explicit
retain/delete policy and confirmation. It never claims an offline phone erased.
Install uses native browser availability; Web Push delivery remains unverified.

Offline reads use real saved observations with a visible read-only banner.
Unvisited detail/month/history/reminders remain unavailable. Root saves pending
proposal/source pages; task detail includes its observed policy and history.
Logout/auth denial clear private snapshots and the request journal. Cache Storage
contains only public hash-matched shell/fonts/icons; API data is never cached by
the service worker. Motion/haptics are optional and reduced-motion is respected.
No test, visual baseline, accessibility audit or device validation was run for
this continuation. See S3-S7-HANDOFF before treating any behavior as verified.
