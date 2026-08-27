#!/usr/bin/env bash
# Drives one CALIPER v2 change-pipeline run to a terminal outcome,
# auto-approving every gate and auto-answering any clarifying question with
# a neutral "use your best judgement" reply -- appropriate for an automated
# calibration trial (BUILD-V2.md step 5), not for a real visitor session.
set -euo pipefail
REQUEST="$1"
LOG="$2"
BASE="http://127.0.0.1:8787"

encoded=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$REQUEST")
curl -s -m 90 -N "$BASE/change-run?request=$encoded" > "$LOG"
runid=$(grep '"runId"' "$LOG" | head -1 | sed 's/.*"runId":"\([^"]*\)".*/\1/')
chunk="$LOG"

for _ in $(seq 1 6); do
  if grep -q '"outcome":"shipped"\|"outcome":"refused-plan"\|"outcome":"refused-verification"' "$chunk"; then
    break
  fi
  if grep -q '"waitingOn":"answer"' "$chunk"; then
    ans=$(node -e "console.log(encodeURIComponent('Use your best judgement and a reasonable default.'))")
    curl -s "$BASE/change-answer?runId=$runid&answer=$ans" > /dev/null
  elif grep -q '"waitingOn":"plan-decision"' "$chunk"; then
    curl -s "$BASE/change-plan-decision?runId=$runid&approve=true" > /dev/null
  elif grep -q '"waitingOn":"review-decision"' "$chunk"; then
    curl -s "$BASE/change-review-decision?runId=$runid&approve=true" > /dev/null
  else
    break
  fi
  curl -s -m 90 -N "$BASE/change-resume?runId=$runid" > "$LOG.next"
  cat "$LOG.next" >> "$LOG"
  chunk="$LOG.next"
done
rm -f "$LOG.next"
echo "$runid"
