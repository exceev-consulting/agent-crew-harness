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

## Releases (maintainers)

One button: **Actions → release → Run workflow**, then choose `patch` (fixes), `minor` (new features) or `major`
(breaking changes). From a terminal: `gh workflow run release -f bump=patch`.

The workflow:
1. bumps `VERSION` and the plugin version, moves the `[Unreleased]` notes under the new version in `CHANGELOG.md`, runs
   the same checks as CI, and puts that `release: vX.Y.Z` commit straight on `main`;
2. tags that commit and publishes the GitHub release: the changelog notes, the merged pull requests grouped by label
   (`.github/release.yml`), a source archive and a `SHA256SUMS` file.

`main` only takes approved pull requests. The one exception is the release GitHub App, which only this workflow uses: it
is on `main`'s bypass list, and its client ID (`RELEASE_APP_CLIENT_ID`, a variable) and private key
(`RELEASE_APP_PRIVATE_KEY`, a secret) live in the `release` environment, which only `main` can use. The app has
**Contents: read and write** on this repository and nothing else. Routines keep their own versions (`routine.json`).

## Community

How the project is run: [GOVERNANCE.md](GOVERNANCE.md). Where to get help: [SUPPORT.md](SUPPORT.md). What comes next:
[ROADMAP.md](ROADMAP.md).

## License

By contributing, you agree that your work is released under the [MIT License](LICENSE). Everyone taking part follows the
[Code of Conduct](CODE_OF_CONDUCT.md).
