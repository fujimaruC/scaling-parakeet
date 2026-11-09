# Remaining-release implementation handoff

Base: c4497da. This is local code and synthetic evidence, not a release verdict.
The real-device record in VERIFICATION-LOG sections 17–19 remains authoritative.
No positive capture, private-network transport or account observation is added.

## Web Push (F19 / W40)

The PWA can explicitly enable notifications in Settings. The Worker stores one
revocable endpoint per browser subscription, with at most four active entries.
There is no automatic permission prompt. Settings can revoke another browser.
Disabling locally unsubscribes even when cloud revocation fails. On logout the
PWA attempts cloud revocation and local unsubscribe before clearing its snapshot.
Revocation failures do not prevent logout. A later expired endpoint is pruned.

The push request has **no application body**. The service worker always displays
one generic Academic OS inbox alert. It never reads a push payload and opens only
the same-origin `/inbox`. This needs no RFC-8291 payload-encryption implementation
and sends no task title, due date, identifier, quotation or message hash to a push
service. The provider still sees the endpoint, timing, sender identity and IP.
The native application continues to use its durable inbox. This browser adapter
is not an Android FCM/native push implementation.

Only exact HTTPS provider hosts `fcm.googleapis.com`,
`updates.push.services.mozilla.com`, and `web.push.apple.com` are allowed.
Credentials, custom ports, query strings, fragments and redirects are rejected.
Other endpoints are explicitly unsupported until reviewed. Browser/provider
support is **unverified**, including whether the owner browser accepts this
empty-body VAPID path. Do not broaden the allowlist from an error response alone.

After each scheduler tick, dispatch scans at most 20 unread inbox/subscription
pairs. Only rows created after subscription and within six hours qualify.
`push_attempts` has a unique inbox/subscription pair. It stores `unknown` before
sending; a process death or network ambiguity is never called success or retried
automatically. HTTP 201 becomes `provider_accepted`, not physical delivery.
404/410 retires the endpoint; other definite responses become `failed`.
Revocation is rechecked before sending. A revocation racing a request already in
flight cannot retract that external request. The generic alert coalesces under
one tag; inbox dedupe and contents never depend on push success. No catch-up
storm or historical backlog is replayed. Recovery from an unknown send is opening
the inbox, not retrying until a phone displays something.

### Owner-only setup after review

Apply migration 0008 before using the new code. Deployment is not done here.
From the checkout root, create the VAPID private JWK in an owner-private directory
outside the repository and outside cloud-sync folders:

```sh
node scripts/create_vapid_secrets.mjs /absolute/private/vapid-private.json
```

The generator uses Node's existing crypto, exclusive creation, mode 0600 and
fsync. It does not print the key. Supply the JSON file as the Worker secret
`VAPID_PRIVATE_JWK`, and a real `mailto:` contact as secret `VAPID_SUBJECT`, using
the owner's local secret-management procedure. Neither belongs in git, static
assets, chat or this archive. Do not run deployment commands until reviewed.
The browser receives only the derived uncompressed public key. Invalid or
mismatched coordinates produce `configuration_invalid`; absent secrets produce
`not_configured`. Both keep the inbox working. Rotate by revoking old
subscriptions and explicitly subscribing afresh with the new key. A delayed
subscribe retry cannot resurrect a revoked endpoint. After an application-server
key change, the first Enable attempt may remove a stale browser subscription;
then explicitly Enable again. Subscription-change events cannot silently create
authenticated server state: revisit Settings after browser subscription loss.

The verifier must configure a synthetic owner account, allow notifications in a
supported browser, create a due reminder, observe the durable inbox independently,
then observe actual notification display and same-origin click. Exercise denied
permission, offline browser, provider failure, expired endpoint and remote revoke.
A Worker HTTP response alone does not close physical-delivery evidence.

Primary protocol references: [RFC 8030](https://www.rfc-editor.org/rfc/rfc8030)
and [RFC 8292](https://www.rfc-editor.org/rfc/rfc8292). No provider account or
external push request was used in synthetic verification.

## Search, calendar and history (F15/F16 / W41)

Inspection contradicted the brief: Tasks already queries the Worker when filtered,
and Calendar already requests a bounded owner-calendar month. Those paths are
retained. Remote search results no longer get filtered again with a different
client comparison. An unfiltered Tasks screen retains its already-observed root
pages; switching from Today does not throw away loaded rows or require another
clock-dependent debounce.

Task cursors now bind to the normalized filter query. Clients continue treating
them as opaque strings. Reusing one with different filters returns 422
`INVALID_CURSOR`, rather than silently skipping potential matches. Limit can
change; filter parameter order does not matter. Old cursors are invalid after
upgrade: refresh the first page. Keyset ordering is stable for unchanged rows;
it is not a cross-page database snapshot. Concurrent task edits can move rows;
refresh after a mutation. Date-only and exact instants retain separate range
predicates; approximate/unknown never gain a calendar cell.

An older-month-page failure retains loaded rows and the cursor for retry. Dots,
day counts and empty-day wording stay explicitly partial until the last page.
Calendar/search are not rewritten or claimed complete from a five-task fixture.
The synthetic integration workload spans 1,200 tasks and a full year.

`GET /history?limit=50&cursor=...` now returns the existing array envelope plus
`meta.next_cursor`. Cursors page descending immutable event IDs. New events do
not shift older pages. The PWA and native History can reach older events and
retain prior pages on a failed request. The legacy no-query route still returns
an array, now with cursor metadata. The PWA caches only observations it read;
missing offline pages remain unavailable. History and task cursors are opaque
protocol tokens, not secrets or a signed authorization mechanism; auth still
protects every read. Canonical approval and idempotency handlers are unchanged.

## Operational budgets and health (F25 / W00/W42)

D1 stores request counts across Worker isolate restarts. Per UTC minute: reads
600, writes 120, signed collector sync/status/control 60, enrollment 10, exports
4. All admitted classes also share a UTC-day 10,000-request cap. Atomic D1 batch
increments count attempts, including refusals. Budget errors are fixed 429
`REQUEST_BUDGET_EXCEEDED`; accounting unavailable is fixed 503
`BUDGET_ACCOUNTING_UNAVAILABLE`. Refusal precedes canonical mutations.

Counts cover authenticated application handlers, verified collector requests,
and public enrollment attempts. They do not cover static assets, rejected auth,
Cloudflare Access traffic, billing, CPU, rows read/written, storage or other
projects. This cannot prevent all platform charges or malicious unauthenticated
traffic. Counting itself uses D1 writes; even rejected requests cost work. Keep
account limits/alerts and owner cost review as a release gate. Never treat this
as a billing integration or a guarantee of zero spend. The existing public
enrollment limiter remains in force in addition to these budgets.

Minute detail is retained seven days and pruned by cron. Health exposes today's
bounded detail with a partial flag and the daily counter. The authenticated PWA
Settings shows these observations. The first prototype limits (120 reads/40
writes) interrupted ordinary coordinated UI refreshes; measured synthetic
workflow justified the current application limits. E2E scenarios now have
independent counter windows in the non-deployed loopback harness. Production has
no test bypass. A separate integration scenario saturates real accounting and
proves the 429/no-mutation behavior through a newly created router.

Cron records started/completed/failed, with timestamps. Missing reports are
`never_reported`; old successful reports are `reported_stale`; recent completed
reports are `healthy`; future/invalid timestamps are `unavailable`. A running
record is `interrupted_or_running`, not an invented success. Staleness thresholds
are 30 minutes for cron and 24 hours for source sync. Source freshness is based
only on last successful cloud sync, not current phone permission or full capture.
Native source detail shows that distinction. No unseen-message count is inferred.

## Native parity audit (F16/F21/F23)

All eight screens were read. Native Tasks already has server search and cursor
loading; detail already pages scoped history; Settings already exports canonical
JSON through the system document picker. These were preserved. Genuine gaps
closed here: global History pagination, removal of its last-100 heuristic, and
source last-report freshness/unavailability detail with ID/EN resources.
No redesign, capture mapping/queue change, permission automation or signing-key
change. Android Views, full verifyApi28 and all approval rules remain.
Actual native layouts, TalkBack, 200% text and owner acceptance remain unverified.

## Rollback

Keep migration0008 tables intact when reverting application code; never drop data
or clear the phone to roll back a UI/adapter. Before a browser-push rollback,
revoke active subscriptions and disable local notification subscriptions through
the reviewed UI. Stop new dispatches, retain unknown attempt history, and refresh
first pages when switching cursor versions. Restore a previously verified native
build only with the same signing identity. Production backup/account/signing
steps belong to the owner after review; none ran in this workspace.
