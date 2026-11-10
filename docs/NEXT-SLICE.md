# Next slice — verification handoff (not a build brief)

**Who this is for:** the local agent on the owner's machine, with the repo and
the phone. The build work goes to a cloud agent via [NEXT-PROMPT](../NEXT-PROMPT.md).

**Base:** the commit that introduced this file. Confirm with
`git log --oneline -1 -- docs/NEXT-SLICE.md`

> **Phone testing is deferred as of 2026-11-09.** The CPH2015 left USB before the
> rebuilt APK (`bc4bd4a2…`) could be installed. Everything in Part 2 below stays
> valid and is the first thing to run when the device is available again; nothing
> in the current build round depends on it.

**Role split, stated once:** the cloud agent writes code. This agent verifies it
on the CPH2015, against a real account when one exists, and records what was
actually observed. Verification does not fix code opportunistically unless the
defect blocks the verification itself; report first, then fix with a regression.

---

## Part 1 — Where the project stands (2026-11-10)

Current as of `8ae37cb`. Round 5 delivered streaming CSV with migration 0009 epoch
tracking, fixed browser seeds, 340-rule structural accessibility checks, and legacy
job one-shot execution (`ad7afc9`). Rebuilt APK `e482a5aa` was installed on the
CPH2015 phone in place, verified clean with zero new crashes.

**Measured on this machine at `8ae37cb`:**

| Check | Result |
|---|---|
| `vitest run` | 10 files, 62 tests passed |
| Python discovery | 102 tests OK |
| `playwright test` | 21 passed across 3 consecutive runs |
| `npm run test:pwa` | 1 passed — offline reload, logout wipe |
| Gradle `assembleDebug lint testDebugUnitTest` | BUILD SUCCESSFUL 4m4s; 8 native-policy, 6 queue-privacy; lint 0 errors |
| all mutation suites | 14 contract + 16 release + 18 round-4 + 12 round-5 = 60 faults, 0 survivors |
| structural accessibility | 340 rule checks passed or N/A across 17 scopes |
| `check_gate_claims.py` | PASS — 2 gate claims, fails closed on drift |
| `measure_resources.ts` | 14 public assets, 24 profiles, 100/1200/10000 tasks |
| planning / placeholders | PASS — 166 links, 30 features, 34 test IDs |
| Hardware install on CPH2015 (API 28) | APK `e482a5aa` in place; crash count stayed 1; clean window (`fatal=false`) |

Earlier figures at `3b84d17` were 58 Vitest / 98 Python / 16 Playwright / 153 links;
they are superseded by the table above.

**Measured on the phone:** install in place with no data loss, launch, reopen, a
complete clean crash window, listener connected and self-recovering, sealed
pairing over `adb reverse` with HMAC-verified requests, and the negative filter
case (28 notifications replayed through a non-matching mapping → queue stayed 0).

**Never observed, by anyone:** a captured notification, real-network transport,
laptop-off queueing, enrollment/activation/revocation on a real account,
Cloudflare Access, 9Router, Web Push delivery, production D1 restore, ITK.

---

## Part 2 — What to verify next, in order

### 1. The positive capture path (highest value, needs one message)

Everything is already configured on the phone: listener connected, pairing
sealed, mapping enabled, receiver running locally, `adb reverse` registered.

```bash
~/aos-scratch/aos-receiver/new-invite.sh      # only if re-pairing is needed
```

Send **one WhatsApp message to yourself**. Then:

```bash
cd /home/riko/Projects/learning-os
.venv/bin/python scripts/device_evidence.py --samples 1
# expect queue_count >= 1, observed_gap_count 0, fatal false, coverage true
```

Then map that conversation in Capture (Inspect metadata → verified name + group
key → enable → Save), let the listener replay, and confirm:

```bash
PYTHONPATH=collectors/local/src .venv/bin/python -c "
import pathlib
from academic_os.core import Store
s=Store(pathlib.Path.home()/'aos-scratch/aos-receiver/data')
for t in ('devices','nonces','receipts','evidence'):
    print(t, s.db.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0])"
```

Evidence must be > 0 and receipts must advance. **Wipe the queue and the
receiver data afterwards** — that message is real content, and the contract says
raw text stays local only for as long as the test needs it.

Do not map a real conversation to make this pass. The point of the test is the
code path, and the owner's own message is the only acceptable input.

### 2. Transport beyond USB loopback

Current pairing proves TLS, pinning, hostname checks and HMAC signing — over
`adb reverse` to `127.0.0.1`. It does **not** prove the private-network path.
Verify: receiver bound to a private address (WireGuard/Tailscale or LAN), phone
on mobile data, laptop off → queue grows, laptop on → batch commits, receipt
applied, queue drains. Record laptop-off behaviour as observed, not assumed.

### 3. Enrollment lifecycle on a real account

Blocked until an account exists. When it does, run
[docs/NATIVE-CLOUD-CHECK.md](NATIVE-CLOUD-CHECK.md) case by case. GUI pending
state alone does not prove the server rejects a pending bearer.

### 4. Cloud build of the next cloud-agent zip

When `NEXT-PROMPT.md` returns a zip: apply the patch to a fresh clone of
the base commit named in that brief, diff it against `source/`, then run every
acceptance command in that prompt yourself. Do not accept `APPLY.md` counts without reproducing them.

---

## Part 3 — Rules for this agent

- Run the checks; quote real output. Never paraphrase a result.
- A green suite is not device evidence. Five defects in this project passed
  every automated check and only failed on the phone.
- Record `unverified` as unverified. Do not upgrade a field by assertion.
- Never automate a notification-access grant unless the owner explicitly asks,
  and record it as a deviation when they do.
- Raw message text, titles, group names and exports never go into git, chat,
  logs or the receiver database beyond the duration of the test.
- Preserve the owner's signing identity. Never uninstall to solve a signature
  mismatch.
- Update [STATUS.md](STATUS.md) and [VERIFICATION-LOG.md](VERIFICATION-LOG.md)
  with a numbered section per session.
- Do not mark any milestone complete.

---

## Part 4 — Environment

```bash
export ANDROID_HOME=/home/riko/Android/Sdk
export PATH="$HOME/.local/opt/jdk-17.0.21+9/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Node 26.12.0, npm 12.2.1, Python 3.14.8 (`.venv`), JDK 17.0.21+9, SDK 35,
build-tools 35.0.0, Gradle 8.11.1. The phone is `W4BI7L6SHQW879SG`, OPPO
CPH2015, Android 9 / API 28, and it drops off USB mid-session — check
`lsusb | grep -i oppo` before diagnosing a code fault, and re-register
`adb reverse` after every reconnect.
