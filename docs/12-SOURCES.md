# 12 — Primary sources and verification status

Research checked 2026-11-06. Vendor pages establish general capabilities only. No owner's Android, Cloudflare account, ITK session, router route or remote network was tested during planning. Re-check changing limits/terms before setup; do not preserve v0.1 claims merely because they had a date.

| Source | What was checked | What remains unverified |
|---|---|---|
| [Android NotificationListenerService](https://developer.android.com/reference/android/service/notification/NotificationListenerService) | Lifecycle connection/rebind; active-notification enumeration; low-RAM Android Q-and-below restriction | Actual phone low-RAM flag, callbacks and available WhatsApp metadata |
| [Android MessagingStyle](https://developer.android.com/reference/android/app/Notification.MessagingStyle) | Structured notification message API | Whether WhatsApp supplies fields on this device; no guaranteed chat identity |
| [Android Auto Backup](https://developer.android.com/identity/data/autobackup) | App backup defaults and exclusion/disable controls | Actual queue exclusion and restore behavior on owner phone |
| [WhatsApp Advanced Chat Privacy](https://blog.whatsapp.com/introducing-advanced-chat-privacy) | Setting can restrict export and use outside chat | Settings in selected conversations; no bypass assumed |
| [WhatsApp export help](https://faq.whatsapp.com/1180414079177245/?cms_platform=android&locale=id_ID) | Manual export reference | Actual export format/history availability; re-check UI rather than hard-code a message limit |
| [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) | Free table lists 100k requests/day, 10ms CPU for HTTP/cron, 5 cron triggers; measure actual workload | Account entitlements, crypto/push/validation CPU and quota usage |
| [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) | Free/paid plan framework | Chosen plan and any paid authorization |
| [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) | Free 5M reads/day, 100k writes/day, 5GB total; quota exhaustion can fail queries | Account usage shared with other work and actual query scans |
| [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) | Free single DB 500MB, account 5GB | Real schema growth |
| [Worker Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) | Worker/hostname protection options; worker-level Access has documented WebSocket limitation | Owner policy/entitlement, collector credential interaction, browser session |
| [D1 batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/) | Prepared-statement batches provide transactional rollback on error | Application CAS guarding; zero affected rows is not an automatic rollback |
| [Tailscale Android](https://tailscale.com/docs/install/android) | Documents Android 8+ | Android 9 installation, battery/VPN coexistence and user acceptance |
| [Tailscale security](https://tailscale.com/security) | Device end-to-end encryption and encrypted relay transit | Owner metadata/relay preference and configured ACLs |
| [Tailscale personal pricing](https://tailscale.com/pricing) | Current personal free option | Account eligibility, future change and final provider choice |
| [Baileys upstream README](https://github.com/WhiskeySockets/Baileys/blob/master/README.md) | Unofficial WebSocket-based WhatsApp Web library; breaking-change warning | Account reliability, actual metadata/history, compliance and privacy fit; research only |

## Existing references retained for future verification, not newly tested

- [ITK Moodle](https://kuliah.itk.ac.id/) — owner session required; no account capability claim.
- [Moodle calendar docs](https://docs.moodle.org/en/Using_Calendar) — generic capability; re-check current docs and ITK implementation before developing integration.
- [9Router upstream integration reference](https://github.com/decolua/9router/blob/master/gitbook/content/en/integration/other-tools.md) — owner may use different version/fork; local smoke test required.

## Research-only linked-device assessment

Baileys is worth comparing because its direct socket approach avoids running a full browser. That is a potential resource advantage, not a measured VAIO benchmark or reliable full-history promise. It requires a separate session/integration and adds version/account-maintenance uncertainty. Recommendation: retain confirmed listener+export MVP and complete a bounded M0 research ADR. No installation, linking, sending or production adapter is authorized here.

## Evidence levels

`owner_confirmed_requirement` → desired behavior. `vendor_documented` → generally described capability. `synthetic_tested` → deterministic implementation evidence. `device_tested`/`account_tested` → actual environment observations. Do not promote one level into another without the corresponding test.
