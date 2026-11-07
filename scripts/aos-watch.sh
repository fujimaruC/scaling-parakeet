#!/usr/bin/env bash
# Watches for the cloud agent's handoff zip or a new commit on origin/main.
# Prints NOOP, or NEW: <details>. Keeps state so it alerts once per event.
set -uo pipefail
REPO="$HOME/Projects/learning-os"
STATE="$HOME/.local/state/aos-watch.state"
mkdir -p "$(dirname "$STATE")"
BASELINE=0
[ -s "$STATE" ] || BASELINE=1      # first ever run: record silently, never alert
touch "$STATE"

cd "$REPO" 2>/dev/null || { echo "NOOP: repo missing"; exit 0; }

NEW=0; MSG=""

# --- new commits on origin ---
git fetch -q origin 2>/dev/null
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "")
SEEN_COMMIT=$(sed -n 's/^commit=//p' "$STATE" | tail -1)
if [ -n "$REMOTE" ] && [ -z "$SEEN_COMMIT" ]; then
  echo "commit=$REMOTE" >> "$STATE"          # first run: baseline, no alert
elif [ -n "$REMOTE" ] && [ "$REMOTE" != "$SEEN_COMMIT" ]; then
  # Commits this agent authored are our own pushes, not inbound work.
  # A range whose tip is Claude-authored is this agent's own push: record it and
  # stay silent. Filtering per-commit alone is not enough, because a push of ours
  # also carries older non-Claude commits that are new only to this watcher.
  TIP_AUTHOR=$(git log -1 --format='%an' "$REMOTE" 2>/dev/null || echo "")
  if [ "$TIP_AUTHOR" = "Claude" ]; then
    INBOUND=""
  else
    INBOUND=$(git log --format='%h %an %s' "$SEEN_COMMIT".."$REMOTE" 2>/dev/null \
              | grep -v ' Claude ' || true)
  fi
  echo "commit=$REMOTE" >> "$STATE"
  if [ -n "$INBOUND" ]; then
    NEW=1
    MSG="$MSG\nNEW COMMIT origin/main: $REMOTE"
    MSG="$MSG\n$(printf '%s' "$INBOUND" | sed 's/^/  /' | head -5)"
  fi
fi

# --- new handoff zips ---
for f in "$HOME/Downloads"/*.zip "$HOME/Downloads"/*/*.zip "$REPO"/*.zip; do
  [ -e "$f" ] || continue
  case "$(basename "$f")" in *Academic-OS*|*academic-os*) ;; *) continue ;; esac
  SIG="$(basename "$f"):$(stat -c %s "$f")"
  grep -qxF "zip=$SIG" "$STATE" 2>/dev/null && continue
  if [ "$BASELINE" = "1" ]; then
    echo "zip=$SIG" >> "$STATE"          # first ever run: record silently
    continue
  fi
  NEW=1
  MSG="$MSG\nNEW ZIP: $f"
  echo "zip=$SIG" >> "$STATE"
done

if [ "$NEW" = "1" ]; then printf "NEW:%b\n" "$MSG"; else echo "NOOP"; fi
