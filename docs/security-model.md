# Security model

The routines run unattended, with tools that can write code and post on GitHub. This page lists what protects you.

## Identity

- Routines post as a GitHub App you create (`bot_app`), installed on one repository, with the smallest permissions that
  work: contents read, issues and pull requests write, security advisories write, actions write (re-runs). Your own `gh`
  login is used only to read.
- Pull request reviews come from a second app (`review_app`, pull requests write only): GitHub never lets an app approve
  its own pull request, and a separate identity makes reviews visible as such.
- Code reaches your default branch only through a pull request you merge. Routines never merge, tag, force-push or push to
  the default branch. Branch protection on your side (required review, required checks) is still recommended.

## Two keys before code

A routine writes code only for an issue a maintainer labelled `agent-ready` or `ready`, and only when a maintainer wrote
the issue or the label was the last word on it. An issue, a comment or a pull request from anyone else is data: it can
start triage, never code. The one exception, the bug-fixer, is off by default and takes only bugs a maintainer or the
harness itself filed.

## Untrusted input

Issues, pull requests (title, body, commits, diff), CI logs, artifacts, advisories and web pages may contain text written
to steer an AI agent. Routines treat it as data: they never run commands from it, never check out or run pull request
code, take conventions only from the default branch, and report attempts in their summary. A review counts an attempt as
a security finding.

## The machine

Routines run on your machine, as you. `PROFILE.md, Machine safety` lists what they must never run there (sudo, docker,
your project's installer...), and `PROFILE.md, Safe commands` what they may. Each run works in its own git worktree under
`harness_dir`, never in your working copy, and a check (`main-check`) refuses to push when a run's lines appear in your
working copy.

## Private data and secrets

- Secrets live in `secrets_dir`, permission 600, written by helpers the user runs (`bot-setup`, `notify --setup`). No
  prompt reads them. Tokens never appear on a command line (`ps`), in a log or in a message.
- `scan-private` refuses any text with your private patterns (hosts, IPs, client names, local paths). `bot-gh` runs it
  on every post: the arguments and every file gh would send (`--body-file` / `-F`, `--input`, `-F key=@file`). It
  copies each file first and gives gh the copy, so the text checked is the text sent. Any other way for gh to read local
  text (stdin, `--recover`, `--template`, `--editor`, `--fill`, release assets, commands other than `api`, `issue`,
  `pr` and `label`) is refused. Routines that push run `scan-private` on their diff. A canary line proves the guard works: a routine that writes
  code stops when the canary passes.
- Telegram messages also go through the guard; a message with private details is replaced by a short notice.

## Security problems found by routines

An exploitable problem in your project is never posted publicly: routines draft a private security advisory and only say
that one was drafted. Upstream CVEs are already public and may be discussed in issues.

## What is not covered

- A maintainer who adds `agent-ready` to a malicious issue gives it the go-ahead: read before you label.
- The machine's own security: a compromised account compromises the routines.
- Claude Code itself and its permission modes: routines need Bypass permissions (or an equivalent allow list) to run
  unattended.
