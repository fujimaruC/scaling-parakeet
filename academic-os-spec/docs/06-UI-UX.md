# 06 — UI/UX AND MOBILE PWA SPECIFICATION

## 1. Audience and design principles
Primary audience is one student who needs fewer missed tasks. Design should feel modern yet usable by older adults: attractive without excessive gradients or animation, predictable navigation, large touch targets, clear hierarchy, readable Indonesian/English text, and visible source trust. The interface is not an admin dashboard for system operators.

**Design rule:** reduce cognitive load. The app must proactively highlight important information rather than require searching every course/group. Avoid misleading green statuses when connectors have not synced.

## 2. App shell / information architecture

| Section | Top-level purpose |
|---|---|
| **Home** | `Today`, most urgent deadlines, `What changed since last visit?`, pending reviews, sync health |
| **Assignments** | All tasks; course filters; statuses; sort by due date/priority; manual entry |
| **Review Inbox** | AI candidates and conflicting source claims; accept/edit/dismiss actions |
| **Calendar** | Month/week/list; exact vs date-only treatment; event evidence |
| **Group Recaps** | Selected groups, summaries by import range, completeness labels |
| **Sources** | ITK Moodle, WhatsApp exports/listener, 9Router status; last sync, gaps, error |
| **Settings** | Identity/session, timezone, reminder policy, privacy/export/delete, push, accessibility |

Use bottom navigation on phones for Home, Tasks, Inbox, Calendar; overflow/menu for other screens. Desktop uses a slim sidebar. Don't create six giant cards on every page; first paint must prioritize next action.

## 3. Key UX flows
### Flow A: Morning briefing
1. Landing top reads `Good morning — here is what matters` (optional non-essential greeting).
2. Show next three most urgent tasks, overdue first, then pending review count, then changes since `last_seen_at`.
3. Provide `Show evidence` drill-down for each new claim.
4. Show `Last LMS sync`, `Last WhatsApp import`, `Last AI run` compactly (with gap and stale warnings).

### Flow B: Review AI candidate
1. Candidate displays suggested action/title/due precision, source group/course, evidence snippet or local-only marker, and confidence status.
2. Buttons `Accept`, `Edit & accept`, `Dismiss`, `Need more info`.
3. On conflict, split panel comparing canonical deadline and new claim with timestamps and source type.
4. On approval, record audit event; announce change success only after server acknowledgment.

### Flow C: Manual task entry
Quick add opens title field, course/group optional, status default `todo`, due date/time optional with explicit `date only` toggle, priority and source optional. No forced AI step. Validate timezone and don't populate invented times.

### Flow D: WhatsApp import health
When no recent export: `Based on your last import from Nov 2; newer messages may not be included.` Button: `Import a chat export on laptop` or later `View companion status`.

## 4. Mobile and performance
- Target Android 9 Chrome/compatible browser; no guarantee Web Push works until device test.
- Avoid heavy animation, video backgrounds, complex radial shaders and oversized charts. Use CSS gradients sparsely; fast initial interaction.
- Prefer system fonts, icon SVG sprites and lazy-loaded non-critical UI; display skeletons only briefly, not as permanent loading blocks.
- Mobile minimum touch target 44×44 CSS px, text at least ~16 px for main body; ensure text scaling 200% doesn't clip essential controls.
- Respect `prefers-reduced-motion`; support keyboard, focus indicators, semantic headings, accessible labels and ARIA only where needed.
- PWA manifest, service worker and offline page; cache only safe static assets and owner-authorized task snapshot. Do not cache authentication response pages or secrets indiscriminately.

## 5. Trust states in the UI
Distinct visual treatment for:
- **Verified source:** manually confirmed by owner or formal LMS assertion verified as a source.
- **AI suggestion:** unconfirmed task candidate.
- **Conflict:** multiple credible due date claims; requires review.
- **Stale:** connector hasn't synced in an expected interval.
- **Partial coverage:** WhatsApp notification snippets or bounded calendar window.
- **Offline cached:** viewing saved data not live cloud information.
- **Blocked:** API permission/Advanced Chat Privacy/expired session prevents collection.

Colors cannot be sole indicators; add icon and text. `Last updated` based on server timestamp with local timezone formatting.

## 6. Reminders and attention design
- Dashboard persistent `Due soon` section. Default urgency: overdue / next 24h / next 3 days / later.
- Daily briefing optional, generated from saved data; if local AI unavailable, deterministic summary such as `3 tasks due tomorrow, 2 candidates need review` still works.
- Notification content can be privacy-safe (`Academic OS: 2 tasks need attention`) on shared lock screens.
- One tap opens a protected task detail; avoid sensitive task descriptions in push payload by default.
- Snooze and mute are explicit user actions with visible next reminder time.

## 7. Suggested design tokens (starting values, not hard visual requirement)
- Background: near-white or deep neutral, with an accessible dark mode if cheap to support.
- Accent: cool teal/blue as action/highlight, single bold accent at a time.
- Type: system UI font with clear 4-level hierarchy; avoid tiny 11px body copy.
- Radius: 10–16px cards, predictable 8px rhythm; separate surfaces subtly, avoid high-elevation everywhere.
- Density toggle optional after MVP; default comfortable.
- User target includes tech-savvy owner and potentially older viewers; no slang required within the product interface.

## 8. Screen acceptance criteria
- On a 360px-wide browser viewport, key task details and controls fit without horizontal scrolling.
- Offline cached view clearly indicates snapshot timestamp.
- At least one missing-date task is shown under `No date` rather than sorted to today.
- New conflict requires explicit action; no hidden auto-overwrite.
- UI visually differentiates notification capture from a complete export.
- Full keyboard navigation and focus visibility work on primary flows.
- Home remains useful with zero integrations configured, by offering manual task entry.
