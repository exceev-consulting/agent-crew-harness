# Changelog

Each routine has its own version (`routine.json`); a routine change names the routine and its new version here.

## [Unreleased]

- New routine feature-planner 1.0.0: the crew's product owner. It specifies ideas a maintainer labels `needs-spec`
  (user story, acceptance criteria, how to verify, sub-issues) and proposes missing features weekly. It never writes code.
  New standard label `needs-spec`.

- New routine status-board 1.0.0: refreshes the status board, a Claude artifact page (pull requests and who they wait
  on, issues, milestones and their release signal, CI, optional end-to-end test results, routine health), twice a day.
  Helper `bin/status-board-collect` with tests, settings in `status-board.json`, page source in `status-board/`.

## [0.1.0]

- First public version. 14 routines at 1.0.0: issue-triage, issue-developer, pr-review, review-fixer, conflict-fixer,
  pr-metadata, ci-doctor, bug-hunter, bug-fixer (off by default), market-research, sentinel, hotfix-developer,
  hotfix-review, security-watch. Shared ground rules in `core/RULES.md`, project facts in `PROFILE.md`.
- Helpers with tests: `bot-gh` / `review-gh` (GitHub App identities), `scan-private` (private-data guard), `notify`
  (Telegram, quiet hours), `sentinel-scan`, `security-watch` (GitHub advisories, OSV, NVD, CISA KEV, pins),
  `harness-watchdog` (systemd, outside Claude), `harness-render` (templates, versions), `harness-doctor`, `app-manifest`.
- Skills: `harness-install`, `harness-profile`, `harness-doctor`. Profiles: blank, server-prep, agent-crew-harness (itself).
