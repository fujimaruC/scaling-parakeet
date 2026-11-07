#!/usr/bin/env bash
# Proves aos-watch.sh stays silent on this agent's own push and alerts on inbound work.
# Runs the real script against a sandbox HOME with a scripted git on PATH.
# Usage: bash scripts/test_aos_watch.sh
set -uo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
W="$ROOT/scripts/aos-watch.sh"
[ -f "$W" ] || { echo "missing $W"; exit 1; }

SB=$(mktemp -d "${TMPDIR:-/tmp}/aos-watch-test.XXXXXX")
trap 'rm -rf "$SB"' EXIT
mkdir -p "$SB/home/.local/state" "$SB/bin" "$SB/repo" "$SB/Downloads"

cat > "$SB/bin/git" <<'STUB'
#!/usr/bin/env bash
case "$1" in
  fetch) exit 0 ;;
  rev-parse) echo "${FAKE_REMOTE:-}" ;;
  log)
    if [ "$2" = "-1" ]; then echo "${FAKE_TIP_AUTHOR:-}"
    elif [ "$2" = "--format=%h %an %s" ]; then printf '%s\n' ${FAKE_RANGE_COMMITS:-}
    fi ;;
  *) exit 0 ;;
esac
STUB
chmod +x "$SB/bin/git"

# Same logic, sandboxed paths only.
sed "s|^REPO=.*|REPO=\"$SB/repo\"|; s|^STATE=.*|STATE=\"$SB/home/.local/state/aos-watch.state\"|; s|\$HOME/Downloads|$SB/Downloads|g" \
    "$W" > "$SB/under-test.sh"
chmod +x "$SB/under-test.sh"

rc=0
run_case () { # name expected-substring tip-author range-commits
  local name="$1" expect="$2" tip="$3" range="$4" out
  printf 'commit=OLDSHA\n' > "$SB/home/.local/state/aos-watch.state"
  out=$(PATH="$SB/bin:$PATH" HOME="$SB/home" FAKE_REMOTE=NEWSHA FAKE_TIP_AUTHOR="$tip" \
        FAKE_RANGE_COMMITS="$range" bash "$SB/under-test.sh" 2>&1)
  if printf '%s' "$out" | grep -q "$expect"; then
    echo "PASS $name -> $(printf '%s' "$out" | head -1)"
  else
    echo "FAIL $name expected '$expect', got: $(printf '%s' "$out" | head -3)"
    rc=1
  fi
}

# Our own push: newer non-Claude commits ride along but the tip is Claude's.
run_case "claude-tip is silent"   "NOOP"  "Claude" "aaa Codex feat: x   bbb Claude docs: y"
run_case "codex-tip alerts"       "NEW:"  "Codex"  "aaa Codex feat: x"
run_case "mixed range, codex tip" "NEW:"  "Codex"  "aaa Claude docs: y   bbb Codex feat: x"

[ $rc -eq 0 ] && echo "ALL PASS" || echo "FAILURES"
exit $rc