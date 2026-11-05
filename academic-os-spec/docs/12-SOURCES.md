# 12 — SOURCES, FRESHNESS AND VERIFICATION LOG

**Compiled:** 2026-11-05. These links ground platform capabilities and hosting constraints, **not** account-specific permissions. Re-check terms and docs before deploying; provider changes can alter feasibility/cost.

## A. Cloudflare (official)
1. **Workers limits** — https://developers.cloudflare.com/workers/platform/limits/  
   As reviewed 2026-11-05: Workers Free 100k requests/day, 10 ms CPU per invocation, 5 Cron Triggers per account. This may change.
2. **Static Assets billing** — https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/  
   Static asset requests documented as free/unlimited, but scripts/SSR routes consume Worker quota; misconfigured worker-first routing can exhaust quota.
3. **D1 pricing** — https://developers.cloudflare.com/d1/platform/pricing/  
   Free tier currently 5M rows read/day, 100k written/day, 5 GB storage across account.
4. **D1 limits** — https://developers.cloudflare.com/d1/platform/limits/  
   Individual free database limit currently **500 MB**; free account total 5 GB. Do not confuse these limits.
5. **D1 free-tier enforcement (2026-09-01)** — https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/  
   Exceeding free daily row quotas makes queries fail until reset, even though data remains stored.
6. **Workers Cloudflare Access** — https://developers.cloudflare.com/workers/configuration/cloudflare-access/  
   Explains protecting Worker and preview domains behind identity policies; **verify Access plan eligibility and setup** on owner's account.
7. **One-click Access for Workers** — https://developers.cloudflare.com/changelog/post/2025-10-03-one-click-access-for-workers/  
   Supports Access protection for `workers.dev` and preview URLs.
8. **Scheduled handler** — https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/  
   Worker Cron handler and local testing; not an uptime guarantee.

## B. Moodle (official platform docs)
9. **Using Calendar / iCalendar export** — https://docs.moodle.org/405/en/calendar/event  
   Moodle generally supports calendar exports and URLs. **No evidence ITK has enabled it for this account.** Tokenized URLs are secrets.
10. **Moodle mobile web services** — https://docs.moodle.org/502/en/Mobile_web_services  
    Moodle web services are administrator-controlled and site/version dependent; existence in Moodle code does **not** mean student token/API access exists at ITK.
11. **Using web services** — https://docs.moodle.org/500/en/How_to_enable_web_services_for_an_external_system  
    Admin capabilities/credentials are required depending on configuration.
12. **University LMS** — https://kuliah.itk.ac.id/  
    Actual account-specific navigation, export and API access remain unverified by this spec. Do not attempt blind endpoint probing or credential harvesting.

## C. WhatsApp (official)
13. **Exporting chat history (Indonesian)** — https://faq.whatsapp.com/1180414079177245/?cms_platform=android&locale=id_ID  
    Manual chat export flow and file limitations.
14. **Advanced Chat Privacy** — https://faq.whatsapp.com/715385484388016/?cms_platform=android&locale=en_US  
    Group feature can disable exporting a chat. Do not circumvent.

## D. Android (official)
15. **NotificationListenerService** — https://developer.android.com/reference/android/service/notification/NotificationListenerService  
    OS callback API and access caveats. Captured notifications are not a complete WhatsApp feed. Documentation notes low-RAM device restrictions on Android Q and below; actual Android 9 device behavior must be tested.

## E. 9Router (project docs; check actual running version)
16. **9Router generic OpenAI-compatible integration** — https://github.com/decolua/9router/blob/master/gitbook/content/en/integration/other-tools.md  
    Documents generic OpenAI-style endpoint and example local URL `http://localhost:20128/v1`. Fork/version differences are possible. The owner reports a working instance with multiple Antigravity-related accounts, but account status, permitted upstream use and future availability are *not verified by Academic OS*.

## F. Known-unknowns log
| Unknown | Current stance | Test to resolve |
|---|---|---|
| ITK calendar export | Unverified | Inspect account calendar/export UI |
| Student-accessible Moodle API | Unverified | Authorized documented API test only |
| LMS automatable within terms | Unverified | Read site terms/permissions and test permitted collection |
| WhatsApp exported format on owner's Android | Unverified | Local owner-exported sample; no shared real chat in code repo |
| Advanced Chat Privacy on target groups | Unknown | Check group settings; respect restrictions |
| Android 9 notification listener reliability | Unverified | Spike on actual device |
| Android browser push reliability | Unverified | Device/browser permissions test |
| Cloudflare Access free eligibility | Verify at deploy | Review dashboard/pricing before setup |
| D1 quotas for actual usage | Theoretical fit | Instrument and load-test with synthetic data |
| 9Router model route and structured JSON support | User reports working router; route capabilities unknown | Local smoke test with chosen route |

## Documentation policy
When new behavior is verified, record: date, observed result, platform version if known, sanitized steps/evidence, and fallback behavior. Preserve a distinction between **vendor-supported generally**, **verified at ITK**, and **tested on this owner's Android 9/Arch hardware**.
