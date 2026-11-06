#!/usr/bin/env bash
# Files the issues from the 2026-11-04 walk and opens a PR adding the walk log row.
# Run once from the root of a clean interval-walking-timer clone: bash file-walk-issues.sh
set -euo pipefail

BRANCH="docs/walk-log-2026-11-04"
LOG="docs/walk-log.md"

[ -f "$LOG" ] || { echo "Run this from the interval-walking-timer repo root."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Commit or stash your changes first."; exit 1; }

git switch main
git pull --ff-only
git switch -c "$BRANCH"

gh label create needs-triage 2>/dev/null || true

file_issue() {
  gh issue create --label needs-triage --title "$1" --body "$2" | tail -n 1 | sed 's#.*/##'
}

LOCK=$(file_issue "Phase cues don't arrive on time when the screen is locked" "Found on the 2026-11-04 walk (3 minutes fast, 3 minutes slow, 5 rounds). The timer kept going with the screen locked, but it didn't tell me on time when the phase changed.

**Likely cause (from reading the code, not yet tested on a locked phone):** phase changes are detected by the interval in \`src/lib/use-timer.ts\`, and iPhones generally suspend web apps when locked. Elapsed time catches up from the wall clock on return, but the cue doesn't play at the right moment.

**First test:** schedule a push for 3 minutes ahead, lock the phone, play music, and check when it arrives and whether it interrupts the music. Push for installed web apps needs a small backend, and its timing is unverified.

Howler.js is unlikely to help: it doesn't stop the app being suspended.")

MUSIC=$(file_issue "Cues should work alongside music" "Found on the 2026-11-04 walk. I got lost in the music and didn't check the timer for most of the walk, so the cues have to reach me without the screen and without stopping my music.

**To test:** whether the current cues interrupt or play over music. The experimental Audio Session API (\`navigator.audioSession.type = \"transient\"\`) is meant for short sounds over other audio, but reports on iOS are mixed and audio may stop once the page is in the background.

Depends on the outcome of the push test in #$LOCK.")

WORKOUT=$(file_issue "Start an Outdoor Walk with the timer" "Idea from the 2026-11-04 walk: starting the timer should also start an Outdoor Walk workout.

**Direction:** an iOS Shortcut could start the workout and open the timer. The Shortcuts Start Workout action needs an Apple Watch.")

STEPS=$(file_issue "Show approximate steps for the walk" "Idea from the 2026-11-04 walk: show the approximate step count across the 5 rounds.

**Open question:** motion sensors probably won't count steps with the screen locked (unverified), which would also affect the planned cadence detection. The Watch or Health may be a better source, but no web API reads Health data directly, so this may need manual entry or a Shortcut.")

printf '| 2026-11-04 | 3 min fast, 3 min slow, 5 rounds | Cues did not arrive on time with the screen locked, though the timer kept going. Barely checked the screen while listening to music. | #%s, #%s, #%s, #%s |\n' \
  "$LOCK" "$MUSIC" "$WORKOUT" "$STEPS" >> "$LOG"

git add "$LOG"
git commit -m "docs: log the 2026-11-04 walk" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01BFh8EtiU1MPALWE8cq1gVM"
git push -u origin "$BRANCH"
gh pr create --title "Log the 2026-11-04 walk" --body "Adds the first real walk to the walk log, with links to #$LOCK, #$MUSIC, #$WORKOUT and #$STEPS.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01BFh8EtiU1MPALWE8cq1gVM"