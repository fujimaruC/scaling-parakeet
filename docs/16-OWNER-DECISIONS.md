# 16 — Confirmed owner decisions

Version 0.2.0, 2026-11-06. Sources: owner-supplied “Academic OS: Confirmed Product Decisions”, attached “Product Questions and Answers”, and three explicit interview selections. The confirmed decisions supersede contradictions in the attachment and v0.1.

> **Provenance warning (2026-11-07).** Neither cited source document exists in this repository or anywhere in its git history: a full-history search for “Confirmed Product Decisions” and “Product Questions and Answers” returns nothing. Every row below therefore rests on an unattributable source. Treat the table as a design note until the owner confirms each row individually; do not cite it as the owner's decision. Rows the owner restates in conversation are the only ones with provenance.
>
> **D05 is superseded.** The owner stated on 2026-11-07 that the product was always meant to be an in-app (native Android) experience, not a PWA, and chose a native Android app when asked directly. D05 is retained below as history, not as current direction. The platform reversal, its cost, and what happens to the existing React implementation are not yet decided and are recorded as open.

| ID | Confirmed decision | Consequence |
|---|---|---|
| D01 | Academic and organizational obligations are equally in scope | Himpunan, meetings and duties must work without a course |
| D02 | Both Android notification listener and manual exports are MVP | Actual Android 9 feasibility is M0; both production paths required for release |
| D03 | Raw export files exclusively on Linux; no cloud raw notification content | Separate local and cloud data contracts; exclude device backups and logs |
| D04 | Every AI task is a proposal until explicit approval | Review/edit/reject; no confidence threshold auto-acceptance |
| ~~D05~~ | ~~Responsive PWA primary; native Android supports collection only~~ **SUPERSEDED 2026-11-07 by owner direction toward a native app** | No duplicate native task-management UI |
| D06 | Linux + 9Router + Worker + D1 retained | Laptop-off cloud reads/reminders; phone capture can queue independently |
| D07 | $0 preferred, not strict | Paid options can be proposed when useful; no spending amount approved |
| D08 | Test real Android 9 lifecycle/metadata/filtering/queue/privacy/recovery in M0 | Simulated success never passes the device gate |
| D09 | Selected private remote phone-to-Linux connection | Propose encrypted private connectivity; no public raw-content upload service |
| D10 | Selected minimized structured cloud proposals | Phone PWA can review unapproved task fields and opaque references; no raw quotations |
| D11 | Selected unofficial linked-device research spike only | Compare Baileys, do not add a third ingestion implementation or link an account yet |
| D12 | Attachment: React/JS/Python/Kotlin familiarity; lightweight Arch/8 GB VAIO | Recommend React TS, Python and Kotlin; pin compatible tooling at M0 |
| D13 | Attachment: ID/EN, light/dark, restrained UI; everyday use not terminal-dependent | Local browser import/settings UI alongside administrative CLI |
| D14 | Attachment: calendar, daily overview, search, history high priority | Include baseline versions in MVP rather than defer all to polish |
| D15 | Attachment: staged implementation on isolated branch | Handoff begins M0 and verifies each milestone |

## Still unknown — operational gates, not permission to invent facts

- Actual phone model/build/browser, low-RAM flag, WhatsApp version and notification fields.
- Course/group/message counts. Benchmark synthetic profiles and label them test loads, not user measurements.
- Moodle calendar/API permissions and Cloudflare account/Access setup.
- Monthly spend ceiling and any paid vendor selection.
- Remote-transport provider, VPN coexistence and background reliability. Tailscale is a proposed M0 candidate, not an installed or owner-selected service.
- Approved AI provider/model and retention terms. External AI remains off until configured with explicit disclosure.
- Real-device test access. If the coding environment cannot access the phone, prepare the APK/test protocol and record the gate as blocked pending an owner-run test.

## Proposed defaults for engineering validation

Default timezone Asia/Makassar; owner may change it. Daily briefing 07:00, reminders 24h/3h before exact due, date-only reminder at 09:00 preceding day; no repeated overdue push by default. These are editable suggestions, not user-chosen times. No scheduled automation has been created.

Use secure private remote transport with phone/Linux pairing; consider Tailscale first, direct WireGuard if appropriate. Pin library/runtime versions only after compatibility checks. Set queue/retention/resource defaults as documented and show them before collection. Do not reinterpret “smartest bypass” as revoking the explicit privacy or approval requirements.
