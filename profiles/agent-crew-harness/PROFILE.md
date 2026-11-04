# Project profile: the harness itself

This profile lets the harness maintain its own repository with its own routines.

## Project

agent-crew-harness is a set of Claude Code scheduled routines that maintain a GitHub repository (triage, develop agent-ready
issues, review pull requests, fix review comments, resolve conflicts, watch security, hotfix lane), with the Bash and
Python helpers they share (`bin/`, `lib/`), their tests (`tests/`), the shared rules (`core/RULES.md`), the routine
templates (`routines/<name>/SKILL.md` + `routine.json`), the ultracode workflow (`workflows/`), project profiles
(`profiles/`) and the installer skills (`skills/`). Maintainers install it on their machine and it acts on their
repository with a GitHub App: a weak rule here lets an agent write where it should not, leak a secret, or follow
instructions planted in an issue.

## Read first

From `origin/main`: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `core/RULES.md`, `docs/routine-format.md`,
`docs/profile.md`, `docs/security-model.md`.

## Machine safety

This machine runs the maintainer's own install of this harness (`harness_dir`, `tasks_dir`) and their other work. A
routine working on this repository must never touch the running install: never write to `harness_dir` outside
`worktrees`, `locks`, `state`, `tmp`; never write to `tasks_dir`; never run `bin/harness-render --render` into
`harness_dir` or `tasks_dir`, the installer skill, `bin/bot-setup`, `bin/notify --setup`, or `systemctl --user`. Never
use sudo. Never call the real Telegram, OSV, NVD or CISA endpoints from tests.

## Safe commands

- `bash tests/<name>.sh` for every file in `tests/` (fake APIs on 127.0.0.1, fake data, no network, no real secret).
- `HARNESS_CONFIG=tests/fixtures/harness.json bin/harness-render --lint` and
  `HARNESS_CONFIG=tests/fixtures/harness.json bin/harness-render --render "$(mktemp -d)"`.
- `bash -n` on shell files, `python3 -I -m py_compile` on Python files, `shellcheck -S warning` when installed.
- Static checks on pull request files read from git without running them: `git show <sha>:<file> | bash -n`,
  `git show <sha>:<file> | shellcheck -S warning -s bash -`.

## CI checks

Every `run:` command of `.github/workflows/ci.yml`: syntax of shell and Python files, ShellCheck at warning level,
`bin/harness-render --lint` with the test fixture, and every `tests/*.sh`.

## Protected paths

`.github/workflows/`, `.claude/settings*.json`, `.claude/hooks/`, `.mcp.json`, `SECURITY.md`. Changes to
`core/RULES.md`, `bin/bot-gh`, `bin/review-gh`, `bin/scan-private` and any routine's "Routine rules" are allowed, but only
in a pull request labelled `security` that says in its first line what an agent can do after the change that it could
not do before.

## Release

Maintainers tag `vX.Y.Z` and publish the GitHub release; routines never tag. Each routine has its own version in
`routine.json` and in the last line of its `SKILL.md` (`<!-- harness-routine <name> vX.Y.Z -->`): a pull request that
changes a routine bumps it (patch: wording; minor: a new step or check; major: a change in what the routine may write
or who it acts for) and adds a line to `CHANGELOG.md`. Users update with `git pull` and the installer skill, which
shows the routine versions that change.

## Conventions

- Prompts are generic: no project names, paths, people or tools; project facts come from PROFILE.md sections, identity
  from `{{placeholders}}` (list in `bin/harness-render`). Never repeat `core/RULES.md` in a routine.
- A decision a script can make (what is new, what to notify, what is stale) lives in a helper in `bin/` with a test in
  `tests/`, and the prompt carries out its plan.
- Helpers read settings only through `lib/harness.sh` (`hconf`) or `lib/harness.py`; test overrides are `HARNESS_*`
  variables honoured only when `HARNESS_TEST=1`.
- Secrets never appear on a command line (`ps`), in a log or in a prompt. Text bound for GitHub or Telegram goes through
  `bin/scan-private`.
- Every loop in a routine has a cap per run and a state file or marker, so a bad run cannot flood a repository.
- Simple words in prompts and docs: short sentences, one idea each.

## Code review checklist

- Does the routine still read as a complete procedure for an unattended run that has read RULES.md and PROFILE.md?
- Steps, limits, markers, lock and state names, trust checks and retry rules kept, or their change explained.
- Version bumped and `CHANGELOG.md` updated when a routine changes; `bin/harness-render --lint` passes.
- Helpers: quoting, exit codes, `set -u`, temporary files with `mktemp`, a test for the new behaviour.
- Docs updated (`README.md`, `docs/`) when behaviour or setup changes.

## Security review checklist

1. Agent permissions: can a routine now write code without a maintainer's `ready`/`agent-ready`, write to the default
   branch, approve or merge, edit a protected path, or act for a different identity?
2. Prompt injection: does a routine now act on text from issues, pull requests, CI logs, advisories or web pages, or
   fetch and run something?
3. Secrets: tokens on a command line, in logs, in prompts or in test fixtures; `secrets_dir` read by a routine.
4. Private data: a path, host, person or client name in a template or a fixture; `scan-private` bypassed.
5. Supply chain: new downloads without a pinned version and checksum, new third-party actions not pinned to a commit.
6. Workflows: `pull_request_target`, untrusted `${{ github.event.* }}` in `run:`, write permissions.

## Vulnerabilities

Exploitable, so a private advisory: a way for an outsider to make a routine write code, post as the app, leak a secret
or private data, or run a command; a guard (`scan-private`, the two-key label rule, the trust check) that can be skipped.
A stricter default that closes no known path is a public hardening idea labelled `security`.

## Labels

- Type: `bug`, `enhancement`, `documentation`, `security`, `skip-changelog`. Priority `priority: critical|high|medium|low`,
  size `size: S|M|L`, as in the routines' standard set.
- Areas from changed paths: `routines/` -> `area: routines`; `bin/`, `lib/` -> `area: helpers`; `core/` -> `area: rules`;
  `profiles/` -> `area: profiles`; `skills/` -> `area: installer`; `docs/`, `README.md` -> `area: docs`;
  `.github/`, `tests/` -> `area: ci`.
- Project board: None.

## Milestones

Bugs and documentation fixes go to "Next patch release". Features go to the next minor release milestone ("v<x>.<y>").
Leave an issue without a milestone when unsure.

## Commits and pull requests

- Title: `<area or file>: <what changes>`, for example `pr-review: check workflow permissions` or
  `bin/notify: quiet hours`.
- A user-visible change adds a line under `## [Unreleased]` in `CHANGELOG.md`; a routine change names the routine and its
  new version.
- Branch prefixes: `claude/fix-<n>-...`, `claude/feat-<n>-...`, `claude/docs-<n>-...`, `claude/hotfix-<n>-...` for the
  routines; `fix/`, `feat/`, `docs/`, `hotfix/` for people.
- No trailer.

## CI workflows

- `ci.yml`: the required check (`ci`). Fast, no network.
- No long end-to-end workflow yet: the CI doctor has nothing to do and stops.
- The default branch counts as red when the latest completed `ci.yml` run on it failed.

## Bug hunting areas

1. `bin/sentinel-scan` and the hotfix routines (sentinel, hotfix-developer, hotfix-review).
2. `bin/security-watch` and the security-watch routine.
3. `bin/bot-gh`, `bin/review-gh`, `bin/scan-private`, `bin/notify` (identity, private data, secrets).
4. The issue developer, `workflows/develop-issue.js` and the fixers (review-fixer, conflict-fixer, bug-fixer).
5. The review routines and pr-metadata.
6. `bin/harness-render`, the installer skill, `bin/harness-doctor`, `bin/harness-watchdog` and the docs.

Look for: a rule in one routine that contradicts RULES.md, a missing cap or state file, a marker that two routines parse
differently, a helper that prints a secret, a test that reaches the network, a placeholder that is not rendered.

## Market research

Users: maintainers of small open-source or company repositories who want agents to do the routine work under their
control. Watch: Claude Code releases (scheduled tasks, skills, plugins, workflows), GitHub features for apps and agents,
other agent frameworks for repositories. In scope: routines that keep a maintainer in control. Out of scope: hosted
services, auto-merge.

## Public examples

Repository `example-org/demo`, project `demo`, login `demo-maintainer`, host `web-01`, domain `example.com`.
