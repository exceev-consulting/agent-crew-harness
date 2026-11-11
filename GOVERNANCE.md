# Governance

How agent-crew-harness is run: who does what, how decisions are made, and who releases.

## Roles

- **Users** install the harness on their own repositories. They get help through [SUPPORT.md](SUPPORT.md).
- **Contributors** open issues, discussions or pull requests. They follow [CONTRIBUTING.md](CONTRIBUTING.md).
- **Maintainers** triage issues, add `agent-ready`, review and merge pull requests, publish releases, handle security
  reports and enforce the Code of Conduct.
- **The routines** (this repository maintains itself, see [docs/self-hosting.md](docs/self-hosting.md)) triage, review,
  specify and develop under [core/RULES.md](core/RULES.md). They post as a GitHub App. They never merge, tag, release or
  push to `main`, and they never code an issue a maintainer did not approve.

The current maintainers are listed in [.github/CODEOWNERS](.github/CODEOWNERS). GitHub asks them to review pull requests.

## How decisions are made

- **Small fixes and doc changes** are decided in the pull request review.
- **Bigger changes need an issue first**: a new routine, a new helper, a changed default, or anything that changes what
  an agent may do. Open the issue (the feature request form works) and discuss it there. A maintainer labels it
  `needs-spec` (the feature-planner routine writes a spec) or `proposal`, then `agent-ready` or `ready` when the approach
  is agreed. Only then open the pull request.
- **Changes to what an agent may do** (`core/RULES.md`, a routine's "Routine rules", `bin/bot-gh`, `bin/review-gh`,
  `bin/scan-private`) carry the `security` label and need a maintainer's approval like any change, after a careful read.

## Releases

Only maintainers release, through the release workflow. See [Releases (maintainers)](CONTRIBUTING.md#releases-maintainers).

Nobody pushes to `main` by hand. Every change goes through a pull request; the one exception is the release workflow's version commit.

## Security reports

Security problems are reported privately, as an advisory: see [SECURITY.md](SECURITY.md). Maintainers handle them.
Never report one in a public issue or discussion.

## AI-assisted contributions

Contributions made with Claude Code, Codex or other AI tools are welcome. They follow the same rules
([CONTRIBUTING.md](CONTRIBUTING.md), [CLAUDE.md](CLAUDE.md)) and get the same review.

The person who opens the pull request answers for it. They understand the change, they ran the checks, and they reply
to the review.

## Becoming a maintainer

Maintainers invite contributors who have helped over time: merged pull requests, reviews, answers in Discussions,
triage. You can also ask a maintainer. The current maintainers agree together.

A new maintainer gets write access and is added to `.github/CODEOWNERS` in a pull request. Stepping down works the same
way: a pull request removes the name.

## Code of Conduct

Everyone follows the [Code of Conduct](CODE_OF_CONDUCT.md). The maintainers are the "community leaders" it mentions:
they enforce it.

## Changing this document

Through a pull request, like any other file.
