---
name: {{task_prefix}}security-watch
description: Every 2 h: new CVEs and advisories for the components listed in security-watch.json (GitHub advisories, OSV distro trackers, NVD, CISA KEV, pinned releases, daily web pass); Telegram alert first, then issues and an operator digest
---

ROUTINE: security-watch for github.com/{{repo}}.
Goal: every 2 hours, find new security problems in what {{project}} depends on, installs or works alongside (the
components of `$R/security-watch.json`), decide what each one means for {{project}} and its users, and act: an issue
when {{project}} must change, a Telegram notice when operators must update, nothing when it does not apply.

Before anything else, read {{harness_dir}}/RULES.md and {{harness_dir}}/PROFILE.md with the Read tool. They are part
of this prompt: RULES.md holds the ground rules of every routine, PROFILE.md the facts of this project. Then read
{{harness_dir}}/security-watch.json: each component's `kind` and `notes` say how {{project}} uses it and who updates
it. Judge every finding from those notes and from {{project}}'s code at `origin/{{default_branch}}`, never from what a
feed or a web page says about {{project}}.

Routine rules
- You may only: read (plain `gh`, `git -C "$MAIN"` fetch/show/grep, WebFetch of advisory pages, web search), run
  "$R/bin/security-watch", "$R/bin/notify", "$R/bin/bot-gh issue create", "$R/bin/bot-gh issue comment" and the
  advisory calls of RULES.md, Security problems, and write files in "$R/tmp/". No worktree, no code changes, no pull
  requests, no labels on existing issues. Never download and run anything.
- Never add `agent-ready` or `ready`. A `priority: critical` issue you open reaches the maintainers through the
  sentinel routine.
- An exploitable flaw in {{project}}'s own code (not upstream; PROFILE.md, Vulnerabilities) follows RULES.md, Security
  problems. Upstream CVEs are already public: a public issue about them is fine.
- Never invent findings: every claim links a primary source (vendor advisory, GitHub advisory, NVD, CISA, distribution
  tracker).
- Limit per run: 15 candidates (the collector's `max_candidates`) and 6 web searches.

Steps
1. `git -C "$MAIN" fetch origin --prune`. Then `"$R/bin/security-watch" --scan --notify` (one to two minutes: NVD is
   rate limited). It reads GitHub advisories, OSV (the distribution trackers listed in `osv_ecosystems`), NVD, CISA
   KEV and the latest release of each pin, and it already sent a Telegram alert for new exploited or critical
   candidates (`prealert` says so). Exit 1: report the error and stop. If there are no candidates, end with
   "Nothing new." Note `errors` (sources that failed) for the summary.
2. For each candidate (at most 15; `more` says how many wait for the next run), decide from the candidate (`kind`,
   `notes`, `patched`, `url`), the advisory page (WebFetch its url when the title is not enough: affected versions,
   fixed version, conditions) and {{project}}'s code at origin
   (`git -C "$MAIN" grep -n -i '<component or package>' origin/{{default_branch}} --`,
   `git -C "$MAIN" show origin/{{default_branch}}:<file> | grep -n ...`):
   - **Applies?** Does a user of {{project}}, set up the way it does by default or with one of its options, run the
     affected component in an affected setup? Check the platform (a client for an operating system the project does
     not target, a library it never installs, a feature it never enables, a version range that none of the supported
     systems ships: `osv_ecosystems` and PROFILE.md, Project). Not applicable: action `skip` with one line why.
   - **What fixes it?**
     - `issue`: {{project}} must change: a pinned version or checksum to bump (`kind` pinned: the pin's file and
       variable are in security-watch.json `pins`), a default that exposes the problem, a hardening that mitigates it
       until a fix ships, a check that should detect the vulnerable version, or a third-party package that is not
       updated automatically (its `notes` say so) and needs a documented or automated update. Search first for an
       issue that already covers it: `gh issue list -R {{repo}} --state all --search "<CVE or GHSA id>"`. If one is
       found open, add one comment with the new facts instead of a new issue (skip if it already lists them).
     - `operators`: nothing to change in {{project}}, but people running it must act. Give the exact action:
       - Distribution package (`kind` distro): the fixed versions are in `patched`. When its `notes` say automatic
         security updates install it, say they will within a day; to install now, give the system's upgrade command
         (for apt: `sudo apt update && sudo apt full-upgrade`), then restart the service or reboot when the package
         needs it.
       - Third-party package that is not updated automatically (its `notes` say so): its package manager's upgrade of
         that one package (for apt: `sudo apt update && sudo apt install --only-upgrade <package>`), or the vendor's
         documented update.
       - A product {{project}} does not install (its `notes` say who updates it): update it the way its notes or its
         vendor's documentation say.
       - {{project}} itself: get the latest release with the command in PROFILE.md, Release, and name the check that
         shows an older version if that section gives one.
     - Both are possible for one candidate.
   - **Priority** for an issue: `priority: critical` when it is in CISA KEV, or critical and reachable in {{project}}'s
     default setup; `priority: high` for high severity or when only an optional feature is affected; otherwise
     `priority: medium`. Labels: `security`, `bug` (a default or behaviour of {{project}} must change) or
     `enhancement` (new check, pin bump), `triaged`, `claude`, and the area and component labels that
     PROFILE.md, Labels gives for the files or the component concerned.
   - Issue: write the body to "$R/tmp/secwatch-issue-<n>.md": **What** (component, ids with links, severity, exploited
     or not), **Who is affected** (which users, which setting or option), **What {{project}} should change**, **How to
     verify** (commands a maintainer runs on a test machine, never on a real one), **Sources**. Title
     `<area>: <what changes> (<CVE or GHSA id>)`, with the area as PROFILE.md, Commits and pull requests names it.
     Create it with `"$R/bin/bot-gh" issue create -R {{repo}} --title ... --body-file ... --label ...`. Exit 4: remove
     the private detail and retry once; any other failure: never retry another way, report it.
3. Daily web pass, only when `"$R/bin/security-watch" --narrative-due` exits 0. It catches what has no CVE yet (an
   incident, a compromised image or package, a breaking upstream change). First `ToolSearch` with query `perplexity`:
   if a Perplexity search tool is available, use it; otherwise use WebSearch (load it with `select:WebSearch` if
   deferred). At most 6 searches, about the last 48 hours, built from the components of security-watch.json: first
   one search per component that is not a distribution package and that users expose or update by hand (its `notes`
   say so), as "<component> security vulnerability"; then group the remaining exposed ones, several per search with
   OR. Keep only items not already in this run's candidates and confirmed by a primary source you can link; a lead
   without a primary source goes into the digest as "unconfirmed" and never into an issue. Then
   `"$R/bin/security-watch" --narrative-done`.
4. Telegram digest, whenever this run handled at least one candidate or found a confirmed web finding: write it to
   "$R/tmp/secwatch-digest.txt", plain text, short: one block per item (component, id, severity, KEV yes/no, the
   action: "issue #n opened" / "update: <command or vendor action>"), then one line "Skipped: <n> not applicable".
   For each `priority: critical` issue add the line
   `Start the hotfix: gh issue edit <n> -R {{repo}} --add-label agent-ready` (the hotfix-developer routine starts within
   30 minutes). Send it: `"$R/bin/notify" --title "🛡️ {{project}}: security watch" < "$R/tmp/secwatch-digest.txt"`
   (add `--silent` when nothing is critical, exploited or for operators to act on). Exit 3 (Telegram not set up):
   fine. Other failure: report it.
5. Mark every candidate you handled (issue, operators or skip) as done:
   `"$R/bin/security-watch" --ack <key> [<key>...]`. Do not ack a candidate whose issue creation failed: it comes back
   next run.
6. Summary: a table (component, id, severity, KEV, action, issue link or reason), the sources that failed, any web
   finding, and what waits for the next run.

<!-- harness-routine security-watch v1.0.0 -->
