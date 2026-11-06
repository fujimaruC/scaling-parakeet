# Academic OS — UI Design & Implementation Spec (Agent Instructions)

Audience: the coding agent that builds `apps/web` (React + TS PWA) for Academic OS.
Owner: Riko, single user. This file defines **how the app must look, feel and behave**, and **how to turn the HTML prototype into the real app**.

---

## 0. How to use this file

1. Read `AGENTS.md`, `docs/16-OWNER-DECISIONS.md`, `docs/06-UI-UX.md` and `docs/07-SECURITY-PRIVACY.md` first. If this file conflicts with them, **stop and write an ADR** in `docs/DECISIONS.md`; do not silently pick one.
2. The visual source of truth is the prototype `docs/design/reference/app.html` (a single self-contained file, owner-approved). Copy it there unchanged. **When a pixel or interaction is ambiguous, open the prototype and match it.**
3. This file is the contract for everything the prototype cannot show: real data, persistence, routing, offline, accessibility, tests.
4. Work one vertical slice at a time (section 13). Update `docs/STATUS.md` and `docs/VERIFICATION-LOG.md` with what was actually run. Never claim coverage, delivery or test results you did not observe.

---

## 1. Design intent

A calm, modern personal tool for academic and organizational deadlines, with **pixel-art accents** that give it character.

**Is:** warm off-white paper, ink-black borders, hard offset shadows, pixel font for headings and numbers, clean sans for reading, segmented pixel progress bars, hand-drawn bitmap icons, subtle dotted background, snappy motion.

**Is not (hard anti-goals):**
- No terminal / hacker / green-on-black / CRT / scanline / "retro hacker" styling.
- No Google-CTF pixel HUD look.
- **No gamification:** no XP, levels, streaks, badges, bosses, scores, confetti, productivity scoring. (Also forbidden by the product spec.)
- No emoji as UI icons. No gradient washes. No glassmorphism.
- Pixel is an *accent*, not the whole UI. Body text is always the sans font.

Feel: "a very good paper planner that got a tiny pixel upgrade."

---

## 2. Design tokens

Implement as CSS custom properties in `apps/web/src/design/tokens.css`. Light is default; dark follows `prefers-color-scheme` unless the user overrides in Settings (`system | light | dark`, stored locally).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F4F2EC` | `#16161A` | app background |
| `--card` | `#FFFFFF` | `#202026` | cards, sheets, nav |
| `--ink` | `#1B1B1F` | `#F2F0EA` | text, borders, shadows |
| `--muted` | `#66635B` | `#A9A69D` | secondary text (must pass 4.5:1 on `--bg` and `--card`) |
| `--accent` | `#2F54EB` | `#7C95FF` | primary action, active tab |
| `--urgent` | `#D6402A` | `#FF7A63` | due < 24 h, overdue, conflicts |
| `--warn` | `#E09A1A` | `#F2B64A` | due < 3 days (bar blocks only, never text) |
| `--course` | `#2F54EB` | `#7C95FF` | academic context color |
| `--org` | `#8A4FD6` | `#B98BFF` | organization (Himpunan) context color |
| `--ok` | `#1F8A5B` | `#4CD39A` | done / accept |
| `--track` | `rgba(27,27,31,.12)` | `rgba(242,240,234,.16)` | empty bar blocks |

Context color is **always paired with a text label or icon** (never color alone).

**Fonts** (self-host, `font-display: swap`; **do not call Google Fonts at runtime** — offline PWA + privacy):
- Display/labels/numbers: **Pixelify Sans** 500/600/700.
- Body: **Inter** 400/500/600.

**Type scale (px):** h1 36 pixel · screen title 28 pixel · section label 16 pixel uppercase +.08em · card title 16–22 sans 600 · meta 13.5 sans muted · tag/chip 13–14 pixel · button 15–17 pixel +.04em · nav label 13 pixel.

**Spacing:** 4-pt grid. Screen side padding 16. Card padding 12–16. Stack gaps 10 (lists) / 26 (sections). App max width 430 centered (phone-first; desktop just centers the column).

**Elevation:** no blur shadows, ever. Cards: `border: 2px solid var(--ink); box-shadow: 4px 4px 0 var(--ink)`. Buttons: 3px offset; pressed state translates `(3px,3px)` and removes the shadow. Cards that sit in a column leave `margin-right: 4px` so the shadow is not clipped.

**Background:** `radial-gradient(color-mix(in srgb, var(--ink) 13%, transparent) 1px, transparent 1px)` at `16px 16px`.

---

## 3. Pixel language

### 3.1 Bitmap icons
All icons are tiny bitmaps rendered to crisp SVG (`shape-rendering="crispEdges"`, `fill: currentColor`). Implement `<Bitmap rows scale color />` that merges horizontal runs into one `<path>` (`M x y h n v1 h-n z`). Icons are decorative (`aria-hidden`) unless inside an unlabeled button, which then needs `aria-label`.

Rows are strings of `0/1`. Use these exactly:

```ts
export const ICONS = {
  sun:   ["000010000","010010010","001000100","000111000","110111011","000111000","001000100","010010010","000010000"], // Today
  list:  ["00000000","11011111","00000000","11011111","00000000","11011111","00000000","00000000"],                     // Tasks
  inbox: ["01111110","10000001","10000001","10000001","11100111","10011001","10000001","11111111"],                     // Review
  cal:   ["01000010","11111111","10000001","10110101","10000001","10101101","10000001","11111111"],                     // Calendar
  check: ["0000001","0000011","1000110","1101100","0111000","0010000"],
  plus:  ["0001000","0001000","0001000","1111111","0001000","0001000","0001000"],
  back:  ["00100","01000","11111","01000","00100"],
  prev:  ["00100","01000","11111","01000","00100"],
  next:  ["00100","00010","11111","00010","00100"],
  arrow: ["001000","000100","111110","000100","001000"],
  star:  ["000010000","000010000","000111000","111111111","011111110","001111100","011101110","011000110","110000011"], // empty states, brand mark
  lock:  ["0111110","0100010","0100010","1111111","1110111","1110111","1111111"],                                        // "evidence stays local"
} as const;
```

Scales: nav 3px/cell, check 2px/cell, chevrons 3, FAB plus 4, empty-state star 6. Add new icons in the same style (≤ 9×9, no anti-aliasing).

### 3.2 Pixel corner (tags only)
`.tag` uses a 3 px stepped `clip-path` polygon. Do **not** apply clip-path to anything with a border or shadow (it would be cut).

### 3.3 Segmented urgency bar (`<UrgencyBar />`)
16 blocks, 12 px tall, 3 px gap, `aria-hidden` (the text next to it carries the meaning).

```ts
function urgency(due: Date, now = Date.now()) {
  const ms = Math.max(0, +due - now);
  const window = ms < DAY ? DAY : 7 * DAY;           // last 24h, otherwise a 7-day window
  const filled = Math.round((1 - Math.min(1, ms / window)) * 16);
  const level = ms < DAY ? "urgent" : ms < 3 * DAY ? "warn" : "normal";
  return { filled, level };
}
```
Filled block color: `urgent → --urgent`, `warn → --warn`, `normal → --accent`. Empty = `--track`. The bar means "time elapsed"; it fills as the deadline approaches.

---

## 4. Navigation & shell

- **Bottom nav** (fixed, 4 tabs): Today · Tasks · Review · Calendar. Pixel icon above a pixel label, min 60 px tall, respects `env(safe-area-inset-bottom)`. Active tab: `--accent` color + 4 px bar on the top edge. **Review shows a count badge** (`--urgent` bg) = number of pending proposals; hide at 0.
- **FAB** (quick-add): 56×56, `--ink` bg, plus icon, `4px 4px 0 var(--accent)` shadow. Visible on Today/Tasks/Calendar, hidden on Review. Opens the quick-add sheet.
- Settings is reached from a small pixel gear in the Today header corner (add the icon in the same bitmap style). Settings contains: language (ID/EN), theme, data export / purge, source status. Keep it out of the bottom nav.
- **Routing (improvement over the prototype):** use real routes so the Android back button works.
  `/today`, `/tasks`, `/review`, `/calendar`, `/tasks/:id` (detail, slides in over the current tab), sheets as history entries (`?sheet=date&id=…`). Back closes the sheet, then the detail, then leaves the tab.
- Tab change plays the entrance animation; in-place updates (toggle, filter) must **not** replay it.

---

## 5. Screens

### 5.1 Today
Order, top to bottom:
1. **Header**: star mark + weekday/date (pixel, uppercase, muted) → `h1 Today` → chips: `N due today` (red/filled if N>0), `N this week`.
2. **Review banner** (only if proposals pending): card with accent number square, "Proposal menunggu review", subline, chevron. Tap → `/review`.
3. **Due today**: one **DueCard** per task due today or overdue (undone first, by due time). DueCard = title (button → detail), meta (source · course · time), big pixel time-left on the right, urgency bar, full-width primary button "Tandai selesai" (done state: ghost button "Batalkan selesai", strike-through title, no bar). Empty → star illustration + "Tidak ada tenggat hari ini".
4. **This week**: list of **TaskRow** for the next 7 days.
5. **Tanpa tanggal**: dashed-border row with count and "tugas belum jelas tenggatnya"; tap → Tasks (scrolled to that group). Unknown dates must always be visible, never hidden.

### 5.2 Tasks
- Header `Tasks`; segmented filter `Semua | Kuliah | Himpunan` (`aria-pressed`).
- Groups in order: Hari ini · Minggu ini · Nanti · Tanpa tanggal · Selesai. Hide empty groups. Within a group: sort by due ascending.
- Empty state: star + "Belum ada tugas".

### 5.3 TaskRow (shared)
`[44×44 check button] [body button: title + meta] [when]`
- Check is a real `<button>` with `aria-label` ("Tandai selesai: <title>"); the visible box is 24 px, hit area 44 px. Pop animation on toggle.
- Meta: context-color square + source · date.
- `when`: pixel text. Today → clock time; later → `H-n` (days left); past → `Lewat`; unknown → `?`.
- Done: strike-through + 50% opacity.

### 5.4 Review (proposal inbox)
Purpose: owner approves/edits/rejects AI proposals. **Nothing becomes a task without an explicit action.**
- Header, then `N dari M` + hint, then a **card stack** (top card + two peeking cards scaled .96/.92, offset 10/20 px).
- Card content: tag (`Baru` / `Konflik tanggal` / `Tanpa tanggal`), title (22 px), context · source line, then:
  - **New:** big pixel date + time (or "Belum ada tanggal — bisa diterima dulu").
  - **Conflict:** two boxes with an arrow: `Sekarang` (struck through, muted) → `Klaim baru` (red border + red hard shadow). Note: "Kalau diterima, tanggal lama tetap tersimpan di riwayat tugas."
  - Footer: lock icon + "Bukti `ev_xxxx` disimpan di laptop. Kutipan chat tidak dikirim ke cloud." **Never render message text or quotes here** — only opaque evidence IDs and structured fields.
- **Swipe:** pointer events, `touch-action: pan-y`. Drag shows `TERIMA` (green, right) / `TOLAK` (red, left) stamps with opacity = clamp(|dx|/90). Release past ±90 px → fly out (`translateX(±480px) rotate(±18deg)`, 220 ms) then commit. Otherwise snap back.
- **Buttons (always present, required for accessibility):** `Tolak` (red outline), `Tanggal` (opens date sheet for the proposal), `Terima` (green). Left/right arrow keys also decide when no input is focused.
- Accepting a *new* proposal creates a task (no date allowed → goes to "Tanpa tanggal"). Accepting a *conflict* changes the task date and **preserves the old claim and its evidence in history**. Rejecting records the rejection (and for conflicts, a history line on the task).
- After each decision show a **toast with "Urungkan"** (4.5 s). Undo must be implemented as a **compensating review action** that is itself recorded in history — never delete history rows.
- Empty: star + "Semua sudah ditinjau" + button back to Today.

### 5.5 Calendar
- Month header: prev button · `Bulan Tahun` (pixel 22) · next button (44×44, labeled).
- Mon-first 7-column grid. Day cell: pixel number + up to 3 colored squares for *undone* tasks that day. Today = 2 px ink border. Selected = accent fill, white number/dots. `aria-label="12 November, 3 tugas"`, `aria-pressed` for selection, `aria-current="date"` for today.
- Below: section label with the selected weekday/date, then TaskRows for that day (include done), or "Tidak ada tenggat di hari ini."

### 5.6 Task detail (`/tasks/:id`)
Full-screen panel sliding in from the right (300 ms). Back button top-left, context tag top-right.
- Title (pixel 28), meta line.
- **Deadline card:** big pixel date + time, time-left line (red if < 24 h), urgency bar, reminder line (**data-driven from `reminder_rules`**, not hard-coded). No date → "Belum ada tanggal" + "Reminder aktif setelah tanggal ditentukan."
- Notes (if any).
- **History timeline** (newest first): pixel square bullets (accent for the newest), label + description. Every mutation is a versioned event (see §8).
- Actions: `Ubah tanggal` (ghost) · `Selesai` / `Batalkan` (green / ghost).

### 5.7 Sheets & toast
- **Bottom sheet:** scrim + panel sliding up (280 ms), 2 px top border, max width 430, safe-area padding. Focus moves to the first input; Esc / scrim tap closes; focus returns to the trigger.
- **Date sheet:** `datetime-local` + `Tanpa tanggal` + `Simpan`. Must support the four date precisions (§8): exact, date-only, approximate, unknown. The prototype only shows exact/unknown — extend the sheet with a precision selector.
- **Quick-add sheet:** title (required), context toggle (Kuliah/Himpunan), optional date, `Tambah`. Manual tasks are source `Manual`.
- **Toast:** ink background, `4px 4px 0 var(--accent)` shadow, `role="status"`, optional pixel-font "Urungkan" action in `--warn`.

---

## 6. Interaction details

| Interaction | Behavior |
|---|---|
| Toggle done | optimistic update, check pop (300 ms), haptic 12 ms (6 ms on un-done), history event |
| Accept | haptic 16 ms; reject 10 ms; date save 8 ms |
| Button press | translate(3px,3px), shadow removed, 80 ms |
| Tab change | content `rise` entrance, 55 ms stagger per block, scroll to top |
| Detail open | slide from right 300 ms; focus the back button; Esc/back closes |
| Urgency bar mount | blocks scale in from bottom with 28 ms stagger |
| Swipe | see 5.4 |

Haptics via `navigator.vibrate` where available; silently no-op elsewhere. All animation disabled under `prefers-reduced-motion: reduce` (state changes still apply instantly).

Time-left text: `<1h → "42m"`, `<24h → "4j 28m"`, else `"N hari lagi"`, past → `"Lewat tenggat"`. Recompute every 30 s while the screen is visible (use a single shared ticker, not per-component timers).

---

## 7. Accessibility (required, not nice-to-have)

- Real `<button>`/`<a>`; no clickable `div`s. Icon-only buttons have `aria-label`.
- Min touch target 44×44 (check box, nav, calendar cells, icon buttons).
- Text contrast ≥ 4.5:1 in light **and** dark; `--warn` is never used for text.
- Never rely on color alone (context has labels; urgency has text).
- Visible `:focus-visible` ring (3 px accent, 3 px offset).
- Swipe has full button/keyboard equivalents.
- Dialogs: `role="dialog"`, `aria-modal`, focus trap, Esc closes, focus restored.
- Toast is `aria-live="polite"`.
- `lang` attribute follows the selected UI language.

---

## 8. Data mapping (UI ↔ product spec)

Do **not** invent entities; map to `docs/02-DATA-MODEL.md` and `schemas/`.

| UI concept | Domain concept |
|---|---|
| Context (Kuliah / Himpunan) | `contexts` |
| Source label (Moodle / WhatsApp / Manual) | `sources` / `source_items` (no bodies, no quotes, no raw hashes in cloud) |
| Review card | `candidates` (+ `candidate_evidence` as opaque IDs) |
| Conflict card | a candidate asserting a new deadline for an existing task (`assertions`) |
| Task | `tasks` (+ `task_evidence`) |
| History timeline | `task_events` (versioned; approvals and reminder recomputation are atomic) |
| Accept / Reject / Edit | `review_actions` |
| Reminder line, badge counts | `reminder_rules`, `reminder_intents`, `notification_inbox` |

**Date precision** (must be modeled and displayed distinctly):
- *exact timestamp* → "Sab 8 Nov, 23:59"
- *date-only* → "Sab 8 Nov" (no time, no urgency bar below 24 h granularity; treat as end of day for sorting)
- *approximate* → "~ minggu depan" style label + warning tone; never silently converted to exact
- *unknown (`null`)* → "Belum ada tanggal", always listed under "Tanpa tanggal"
Relative dates resolve from the **source message time**, never from "today".

**Mutations** are versioned. Writes use idempotency keys and the retry semantics in `docs/10-API-CONTRACTS.md`. UI shows optimistic state, reconciles on server response, and surfaces failures with a toast (no silent drops).

**Hard rules carried over from the product spec (do not violate in UI):**
- Every AI-extracted task waits for explicit owner approval.
- No raw chat text, quotes, exports or content hashes in Worker/D1, logs, assets or crash reports.
- Cloud tasks/briefing/reminders must render with the laptop and 9Router off.
- Never fabricate counts, coverage, deadlines, push delivery or test results. **All sample data in the prototype is synthetic and must live only in `tests/fixtures` / dev seeds, never in production code paths.**

---

## 9. Real-app implementation plan

### 9.1 Stack (`apps/web`)
- React + TypeScript, Vite, static PWA deployed with the Worker assets.
- Routing: React Router (routes in §4).
- Server state: TanStack Query against the Worker API (contracts from `packages/contracts`); UI state (filter, selected calendar day, sheet) in a tiny Zustand store or URL params.
- Styling: plain CSS modules + `tokens.css` (the design is token-driven and small; avoid a UI kit — it would fight the pixel look). No runtime CSS-in-JS.
- Dates: `Intl.DateTimeFormat` + small helpers in `lib/dates.ts`; timezone fixed to the owner's setting (default `Asia/Makassar`). No heavy date library.
- i18n: dictionary files `id.ts` / `en.ts`, default **Indonesian**; all strings via `t()`; pluralization/`H-n` formatting in helpers.

### 9.2 Suggested structure
```
apps/web/src/
  design/        tokens.css, base.css, motion.css
  pixel/         Bitmap.tsx, icons.ts, UrgencyBar.tsx, Tag.tsx
  components/    Box, Chip, Button, TaskRow, DueCard, ReviewCard, Sheet, Toast, Nav, Fab, EmptyState
  screens/       Today, Tasks, Review, Calendar, TaskDetail, Settings
  lib/           dates.ts, urgency.ts, i18n/, haptics.ts, ticker.ts
  data/          api client, queries, mutations, offline snapshot
  routes.tsx  main.tsx
```
Keep components dumb and prop-driven; screens own data fetching.

### 9.3 Persistence & offline
- **Offline snapshot (F20):** cache the last successful read of tasks, proposals, reminders and history in IndexedDB (via `idb`). When offline, render from the snapshot with a visible pixel banner "Offline — hanya baca". **Offline writes are out of MVP (F30):** disable mutating controls offline and say why; do not queue silently.
- Never put raw evidence or quotes in the snapshot (they are not in cloud data anyway).
- Settings (language, theme) live in `localStorage`.
- Provide export / encrypted restore / purge entry points per F23/F24 (Settings screen), without resurrecting purged items.

### 9.4 PWA
- `manifest.webmanifest`: name "Academic OS", `display: standalone`, `theme_color`/`background_color` from tokens, maskable pixel-star icon (generate from the `star` bitmap at 192/512).
- Service worker: precache app shell + fonts; network-first for API with the IndexedDB snapshot as fallback.
- Push/reminders: **feasibility first (F19).** Do not promise push. Build the in-app notification inbox and cloud reminder state; add Web Push only after proving it on the real Android 9 device, and record evidence.

### 9.5 Where the other surfaces plug in
- Android companion and Linux collector are separate modules; the web app only consumes the Worker API (proposals, tasks, source health). Do not add device-pairing UI here beyond what `docs/06-UI-UX.md` specifies.
- Source label strings come from the API, not hard-coded.

### 9.6 Compatibility (the owner's phone is Android 9)
The prototype uses modern CSS/JS. Before relying on it, **verify on the real device's Chrome/WebView version** and add fallbacks where needed:
- `color-mix()` → provide solid fallback values (e.g. precomputed dot-grid and track colors).
- `100dvh` → fall back to `100vh`.
- `structuredClone` → use a small clone helper.
- `inset`, `aspect-ratio`, `clip-path`, pointer events → check support; polyfill or degrade gracefully.
Record the tested browser version in `docs/VERIFICATION-LOG.md`.

---

## 10. Quality bar & tests

- **Unit (Vitest):** `urgency()`, time-left/`H-n` formatting, date-precision rendering, grouping/sorting, conflict-accept/reject/undo reducers, i18n key coverage (id/en parity).
- **Component:** TaskRow, DueCard, ReviewCard states (new / conflict / unknown date), Sheet focus trap.
- **E2E (Playwright, synthetic fixtures only):** toggle done; swipe accept/reject (pointer events) and button/keyboard equivalents; conflict accept preserves old date in history; undo; quick-add; calendar navigation; detail back via browser back; offline read-only banner; light/dark.
- **Visual regression:** screenshots at 390×844 (light + dark) for Today, Tasks, Review (each card type), Calendar, Detail, each sheet. Compare against `docs/design/reference/app.html` renders.
- **A11y:** axe checks on every screen, manual keyboard pass, reduced-motion pass.
- `npm run check` must pass. Never mark a gate complete on mocks alone.

### Acceptance checklist (all must be true)
- [ ] Looks like the reference: tokens, fonts (self-hosted), pixel icons, hard shadows, segmented bar, dotted bg.
- [ ] No gamification, no terminal/hacker styling anywhere.
- [ ] All five screens + three sheets + toast implemented with the behaviors above.
- [ ] Swipe, buttons and keyboard all work for review decisions; undo is a recorded compensating action.
- [ ] Conflict acceptance preserves the old claim + evidence ID in history.
- [ ] Four date precisions modeled and rendered; unknown dates always visible.
- [ ] No quotes/raw text rendered or cached; only opaque evidence IDs.
- [ ] Android back button, deep links and tab state work.
- [ ] Offline read-only snapshot works; writes disabled with an explanation.
- [ ] ID/EN strings complete; light/dark/system theme works.
- [ ] WCAG-level checks pass (contrast, 44 px targets, focus, reduced motion).
- [ ] Tested on the real Android 9 device; versions and results logged honestly.

---

## 11. Order of work (vertical slices)

1. **S1 — Foundation:** tokens, self-hosted fonts, `Bitmap` + icons, Box/Chip/Tag/Button/UrgencyBar, shell + nav + FAB, theme switch, i18n scaffold. Storybook-style dev page (`/__kit`) showing every primitive in light/dark.
2. **S2 — Read-only Today/Tasks/Detail** against real Worker data (M1 contracts), grouping, urgency, history timeline.
3. **S3 — Writes:** toggle done, quick-add, date sheet (with precisions), versioned history, optimistic updates + error toasts.
4. **S4 — Review inbox:** card stack, swipe + buttons + keys, conflict card, compensating undo, evidence-ID footer (needs M3 proposal inbox).
5. **S5 — Calendar** and Settings (language, theme, export/purge).
6. **S6 — Offline + PWA:** IndexedDB snapshot, service worker, manifest/icons, offline banner; Android 9 device verification; push feasibility note.
7. **S7 — Polish:** motion tuning, haptics, empty states, visual-regression baselines, a11y audit.

After each slice: run the checks, update `docs/STATUS.md` and `docs/VERIFICATION-LOG.md`, and stop for owner review before the next slice.

---

## 12. Non-goals

Teams/sharing, public accounts, productivity scoring, gamification, offline writes (F30), recurrence/subtasks (F28), group recaps (F29), custom theming engine, any third-party UI kit.
