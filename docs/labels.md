# Labels

The routines hand work to each other with labels. `config/labels.json` holds the standard set below (name, colour,
description); the installer creates the missing ones in your repository. Area labels (`area: ...`) and any other
project labels are yours: list them in PROFILE.md, Labels, with the rule that picks them.

| Label | Meaning |
|---|---|
| `agent-ready` | Has acceptance criteria and verification commands: Claude Code or Codex can pick it up |
| `bug` | Something isn't working |
| `ci-failing` | A required check fails on the latest commit |
| `claude` | Opened by a Claude Code routine |
| `dependencies` | Updates a dependency or GitHub Action |
| `documentation` | Improvements or additions to documentation |
| `duplicate` | This issue or pull request already exists |
| `enhancement` | New feature or request |
| `epic` | Groups related sub-issues; progress shows in the Sub-issues panel |
| `first-time contributor` | First pull request from this contributor |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention is needed |
| `invalid` | This doesn't seem right |
| `needs-changelog` | User-visible change without a CHANGELOG.md line |
| `needs-ci-approval` | CI is waiting for a maintainer to approve the workflow run |
| `needs-info` | Waiting for details from the reporter |
| `needs-spec` | A maintainer asks the feature-planner routine to write the specification |
| `needs-rebase` | Has merge conflicts with main |
| `priority: critical` | Breaks servers or security now: fix first |
| `priority: high` | Needed for the current phase |
| `priority: low` | Nice to have |
| `priority: medium` | Important, not urgent |
| `proposal` | Feature idea waiting for a maintainer decision |
| `question` | Further information is requested |
| `ready` | Approved by a maintainer: routines may implement it |
| `review: changes suggested` | Claude's latest review of the current commit suggests changes |
| `review: do not merge` | Claude's latest review of the current commit found a blocking or security problem |
| `review: looks good` | Claude's latest review of the current commit found nothing blocking |
| `security` | Security fix or hardening of a default |
| `size: L` | Large: more than 3 days, may be split |
| `size: M` | Medium: 1 to 3 days |
| `size: S` | Small: under a day |
| `skip-changelog` | Leave out of the release notes |
| `stale` | No activity for 30 days |
| `status: blocked` | Waiting on another issue or an outside change |
| `status: needs-repro` | Waiting for steps or output to reproduce |
| `status: needs-triage` | New: a maintainer has not looked at it yet |
| `triaged` | First response done by the triage routine or a maintainer |
| `wontfix` | This will not be worked on |

Who sets what:
- People: `ready`, `agent-ready` (the go-ahead to write code), `needs-spec` (ask the feature-planner for a specification),
  `priority: critical` when a maintainer confirms a blocking bug.
- issue-triage: `triaged`, `needs-info`, type, `priority:` and `size:` labels on issues.
- bug-hunter, security-watch, market-research: open issues with `claude` (+ `bug` / `enhancement` / `proposal` / `security`).
- feature-planner: writes specifications, opens sub-issues and weekly `proposal` issues; removes `needs-spec` once done.
- pr-metadata: every label on pull requests it manages, including `review: ...`, `ci-failing`, `needs-rebase`,
  `needs-changelog`, `stale`, `needs-ci-approval`, `first-time contributor`.
- sentinel: opens a `priority: critical` issue when the default branch stays red.
