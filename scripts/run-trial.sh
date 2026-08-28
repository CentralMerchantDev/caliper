#!/usr/bin/env bash
# Drives one CALIPER v2 change-pipeline run for a trial sweep.
#
# Gate rule (Mark's explicit instruction): batch authorisation is a human
# decision the agent executes, not one it makes. Mark chose the five trial
# change requests, so approving THEIR plans in advance is his decision,
# executed here -- plan gates are pre-authorised. Review gates are never
# auto-resolved, ever: a run that reaches one HALTS and is reported as
# "gated". What the reviewer found is the thing being measured; supplying
# the decision would destroy the measurement as well as the principle.
#
# Isolation: a trial run must never mutate the live sim/current-source key.
# Reset before this run to guarantee a pristine starting baseline, and if
# the run ships, capture that code under an isolated trial-results key
# before immediately resetting sim/current-source back to pristine.
set -euo pipefail
REQUEST="$1"
LOG="$2"
SLUG="$3"
BASE="http://127.0.0.1:8787"

npx wrangler kv key delete "sim/current-source" --binding SPEND_KV --local >/dev/null 2>&1 || true

encoded=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$REQUEST")
curl -s -m 90 -N "$BASE/change-run?request=$encoded" > "$LOG"
runid=$(grep '"runId"' "$LOG" | head -1 | sed 's/.*"runId":"\([^"]*\)".*/\1/')
chunk="$LOG"

for _ in $(seq 1 6); do
  if grep -q '"outcome":"shipped"\|"outcome":"refused-plan"\|"outcome":"refused-verification"' "$chunk"; then
    break
  fi
  if grep -q '"waitingOn":"review-decision"' "$chunk"; then
    # STOP. Never resolved here -- this run stays halted and is reported gated.
    break
  fi
  if grep -q '"waitingOn":"answer"' "$chunk"; then
    ans=$(node -e "console.log(encodeURIComponent('Use your best judgement and a reasonable default.'))")
    curl -s "$BASE/change-answer?runId=$runid&answer=$ans" > /dev/null
  elif grep -q '"waitingOn":"plan-decision"' "$chunk"; then
    curl -s "$BASE/change-plan-decision?runId=$runid&approve=true" > /dev/null
  else
    break
  fi
  curl -s -m 90 -N "$BASE/change-resume?runId=$runid" > "$LOG.next"
  cat "$LOG.next" >> "$LOG"
  chunk="$LOG.next"
done
rm -f "$LOG.next"

# Isolation: capture a real ship under a trial-namespaced key, then reset
# the live baseline immediately so the next rep -- and the final state of
# this sweep -- starts pristine. "wrangler kv key get" on a missing key
# exits 0 and prints the literal string "Value not found" to stdout, so
# absence must be checked by content, not exit code or non-emptiness.
shipfile="$LOG.shipped"
npx wrangler kv key get "sim/current-source" --binding SPEND_KV --local > "$shipfile" 2>/dev/null || true
if [ -s "$shipfile" ] && [ "$(cat "$shipfile")" != "Value not found" ]; then
  npx wrangler kv key put "trial-results/$SLUG/shipped-code" --path "$shipfile" --binding SPEND_KV --local >/dev/null 2>&1
  npx wrangler kv key delete "sim/current-source" --binding SPEND_KV --local >/dev/null 2>&1
fi
rm -f "$shipfile"

echo "$runid"
