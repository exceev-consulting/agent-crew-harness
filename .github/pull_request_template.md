## What and why

<!-- What changes, which problem it fixes. Fixes #123. For a security-relevant change: first line = what an agent can do
after this change that it could not do before. -->

## How I tested it

- [ ] `HARNESS_CONFIG=tests/fixtures/harness.json bin/harness-render --lint`
- [ ] `for t in tests/*.sh; do bash "$t" || exit 1; done`
- [ ] A changed routine: rendered and read once
  (`HARNESS_CONFIG=tests/fixtures/harness.json bin/harness-render --render "$(mktemp -d)"`), or run on a test repository

## Checklist

- [ ] A changed routine has a new version (routine.json and the last line of SKILL.md) and a CHANGELOG line
- [ ] Routines stay generic: project facts in PROFILE.md, no names, paths or people
- [ ] A new decision a script can make is in `bin/` with a test (no network, no real secret)
- [ ] Changes what an agent may do (RULES.md, Routine rules, bot-gh, review-gh, scan-private): `security` label
- [ ] User-visible change: a line under `## [Unreleased]` in `CHANGELOG.md`
- [ ] No secret, real host, IP or person in code, tests or docs
- [ ] Messages and docs use simple words
