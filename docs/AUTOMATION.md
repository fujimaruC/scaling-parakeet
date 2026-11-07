# Background checks while the owner is away

The workflow is: prompt → GitHub → cloud agent works in its own workspace → zip comes back → we test locally. The owner cannot sit at the laptop, so the gap that needs covering is **waiting for the zip**.

## What runs

A session-only scheduled job checks every 30 minutes at `:13` and `:43`. Each run:

1. Executes `~/.local/bin/aos-watch.sh`.
2. If nothing changed, replies `NOOP` and stops.
3. If a new handoff zip appeared in `~/Downloads` (or a new commit landed on `origin/main`), it verifies the delivery and reports.
4. Sends one push notification so the owner sees the outcome on their phone.

## Watcher design

`aos-watch.sh` keeps state in `~/.local/state/aos-watch.state` and alerts **once per event**, not once per run.

- First run records the current zips and `origin/main` silently. Existing archives never trigger an alert.
- A zip is identified by `basename:size`. A re-download of the same name at a different size counts as new.
- A new commit is compared against the last seen `origin/main` hash. A range whose tip is authored by Claude is treated as our own push and recorded silently, because the cloud agent never authors as Claude. Filtering merely per-commit is not enough: one of our pushes also carries older non-Claude commits that are new only to this watcher, and reporting those reads as an inbound delivery. `scripts/test_aos_watch.sh` proves all three cases.
- It needs only `bash`, `git` and the coreutils in `basename`, `stat`, `sed`, `grep`, `printf`. Nothing sources an interactive shell profile, so it behaves the same from the scheduler as from a terminal. There is no `env -i` wrapper; do not claim one.

Verified behaviour: silent baseline, `NOOP` when quiet, `NEW:` on a simulated arrival, `NOOP` again after the arrival is recorded.

The script is checked in at `scripts/aos-watch.sh`; the copy at `~/.local/bin/aos-watch.sh` is the one the schedule invokes. Install with:

```bash
install -m 755 scripts/aos-watch.sh ~/.local/bin/aos-watch.sh
```

## What this cannot do

- **It cannot see ChatGPT's workspace.** Nothing exists to watch until the zip is downloaded to this machine or a commit is pushed.
- **It cannot run while the laptop is asleep or Claude Code is closed.** The schedule lives in this session. A sleeping machine misses runs; it does not queue them.
- **It expires after 7 days** and does not survive restarting the session.
- **It does not approve or push anything.** Verification and reporting only.

If the owner wants this to survive sleep and restarts, it needs to move to a system-level scheduler (systemd timer or cron) running the same script. The script is written to work that way already; only the scheduling differs.

## For the owner

Leave the zip anywhere in `~/Downloads` — including a subfolder. Do not rename it; the filename pattern `*Academic-OS*` or `*academic-os*` is what the watcher matches.

Nothing needs to be running for the zip to be *stored*; the check happens whenever the schedule next fires.
