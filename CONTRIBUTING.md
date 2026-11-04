# Contributing

Thanks for helping. Issues, ideas and pull requests are welcome. This repository is maintained with its own routines
(see [docs/self-hosting.md](docs/self-hosting.md)): a Claude app will triage your issue and review your pull request,
and a maintainer decides.

## Before a pull request

```bash
for f in bin/* tests/*.sh lib/*.sh; do head -1 "$f" | grep -q bash && bash -n "$f"; done
HARNESS_CONFIG=tests/fixtures/harness.json bin/harness-render --lint
for t in tests/*.sh; do bash "$t" || exit 1; done
```

CI runs the same (`.github/workflows/ci.yml`), plus ShellCheck at warning level and a parse check of the workflow
script.

## Rules

- **Routines stay generic.** No project names, paths, people or tools in a routine. Project facts belong in
  `PROFILE.md` (see [docs/profile.md](docs/profile.md)); identity comes from `{{placeholders}}`. Read
  [docs/routine-format.md](docs/routine-format.md).
- **Never repeat `core/RULES.md` in a routine**, and never loosen it.
- **Version every routine change**: bump `version` in `routine.json` and the last line of `SKILL.md` (patch: wording;
  minor: a new step or check; major: a change in what the routine may write or who it acts for), and add a line to
  `CHANGELOG.md` under `[Unreleased]`.
- **Decisions a script can make go in `bin/`, with a test** in `tests/` that needs no network and no real secret
  (fake APIs, `HARNESS_TEST=1`, `tests/fixtures/harness.json`).
- **Security-relevant changes** (RULES.md, a routine's "Routine rules", `bot-gh`, `review-gh`, `scan-private`) carry the
  `security` label, and the first line of the pull request says what an agent can do after the change that it could not
  do before.
- Simple words: short sentences, one idea each.

## Commits and pull requests

Title: `<area or file>: <what changes>` (`pr-review: check workflow permissions`). One topic per pull request.
Pull requests are squash-merged.
