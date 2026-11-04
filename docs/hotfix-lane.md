# Hotfix lane

A blocking bug or a security problem should not wait for the next scheduled developer run.

## Classes

- **Security (S0):** an exploitable defect (`PROFILE.md, Vulnerabilities`). Tracked as a private advisory, never a public
  issue. A maintainer decides per advisory: fix it in public under a neutral title, or privately in the advisory's
  temporary fork.
- **Blocking (S1):** a public issue labelled `priority: critical`: the project is broken for its users now, or the default
  branch fails its checks.

## Flow

1. **Detection.** A maintainer, issue-triage, bug-hunter, pr-review or security-watch sets `priority: critical` or drafts
   an advisory. The sentinel opens a critical issue itself when the default branch stays red.
2. **Alert.** Within 30 minutes the sentinel tells the maintainers on Telegram and the desktop, once per event: new
   critical issue, new draft advisory, "do not merge" review, red default branch, merged critical fix not yet released.
3. **Go-ahead.** The maintainer confirms and adds `agent-ready`. The alert gives the command.
4. **Fix.** hotfix-developer (every 30 minutes) picks the issue first, across milestones, even when many routine pull
   requests are open, on a `claude/hotfix-<n>-...` branch. hotfix-review (hourly) reviews it first. The other routines
   also put critical pull requests first.
5. **Release.** The maintainer merges and releases (`PROFILE.md, Release`). The sentinel reminds once if a merged critical
   fix is still unreleased after a day.
6. **Users.** `PROFILE.md, Release` says how users learn about and install the fix.

## Settings

`sentinel.json`: the critical label, the go-ahead labels, the hotfix branch prefixes, the workflows that make the default
branch red (and after how many failures), the release command, the thresholds for late or hung routines, and patterns that
flag a "successful" run whose summary reports a failure.
