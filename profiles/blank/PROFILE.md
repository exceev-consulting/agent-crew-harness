# Project profile

<!-- Every routine reads this file at the start of each run. Keep the section titles exactly as they are: the routines
refer to them by name. Replace each comment with facts and rules. A section that does not apply says "None."
Never put secrets, real hostnames or private IPs here. docs/profile.md explains each section. -->

## Project

<!-- Two or three sentences: what the project does, for whom, its languages, and what a mistake costs its users.
Then: what a bug report must include (environment, version, command, output), and where known behaviour is listed. -->

## Read first

<!-- Files every routine reads from origin/<default branch> before acting, and what matters most in them.
Example: CLAUDE.md (conventions and known traps: never regress one), CONTRIBUTING.md, SECURITY.md. -->

## Machine safety

<!-- What else runs on this machine, and what a routine must never run here even though it would work.
Example: never use docker, systemctl (except status), apt; never run ./install.sh, even with --dry-run. -->

## Safe commands

<!-- Project commands a routine may run here, exactly. Example: npm test, npm run lint, ./tool --help.
Static checks on pull request files read from git without running them, for reviews: git show <sha>:<file> | <linter> -. -->

## CI checks

<!-- The commands to run before every push so CI passes. Example: every `run:` command of .github/workflows/ci.yml
except the ones that install tools. -->

## Protected paths

<!-- Paths a routine never creates or edits. Example: .github/workflows/, .claude/settings*.json, .claude/hooks/, .mcp.json. -->

## Release

<!-- How releases happen and what routines never touch. Example: maintainers run the release workflow; never change the
version in package.json, never tag. How users update, and how the project tells them a new release fixes a security problem. -->

## Conventions

<!-- The rules a change must follow, or where they live (CLAUDE.md). Known traps that must never come back. -->

## Code review checklist

<!-- What a review checks here beyond "it works": error handling, tests required, docs and changelog updated, style. -->

## Security review checklist

<!-- The attack surface: untrusted inputs, privileges, injection, supply chain (pinned versions, checksums), secrets
handling, defaults that must stay safe. -->

## Vulnerabilities

<!-- What counts as an exploitable vulnerability (private advisory) here, with examples, and what is only a public
hardening idea. -->

## Labels

<!-- Type labels (bug, enhancement, documentation, security), priority and size meaning, area labels and how to choose
them (path -> label), labels owned by routines. Project board: name or "None.". -->

## Milestones

<!-- How issues are placed: the milestone for bug fixes, how feature milestones are ordered, when to leave none. -->

## Commits and pull requests

<!-- Title format, changelog rule, pull request template, branch prefixes, trailers, generated files to regenerate. -->

## CI workflows

<!-- Workflow files and what each checks, which check is required, the long test workflow (name, jobs, artifacts, result
file) for the CI doctor, and which workflows count when the default branch is red. -->

## Bug hunting areas

<!-- A numbered rotation, one area per week, then the classes of bugs to look for in this project. -->

## Market research

<!-- Users, upstream projects and competitors to watch, scope in and out. -->

## Public examples

<!-- What to use in public text instead of real data. Example: web-01, 192.0.2.10, example.com. -->
