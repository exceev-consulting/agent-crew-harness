# Project profile: server-prep

## Project

server-prep (github.com/exceev-consulting/server-prep) is Bash tooling that secures Debian and Ubuntu servers (cloud VPS
or dedicated) for self-hosted PaaS panels such as Coolify, Dokploy and Openship, plus a read-only audit. Three scripts:
`server-preconfig.sh` (first step on a fresh server), `server-prep.sh` (the steps), `server-audit.sh` (proves the result).
Users run them as root on real servers: one injected command or weakened default can compromise a server or lock its
admin out. Many users are not security experts: write in simple words.

A bug report needs: the OS and version, VPS or dedicated server (or laptop, VM), the panel, the server-prep version
(first line of `./server-prep.sh --help`), the command and the failing step, and the relevant lines of the report
(`/root/server-prep-reports/`), the log (`/var/log/server-prep/`) or the audit. Known behaviour that is not a bug (normal
WARNs on a desktop, sudo-rs on Ubuntu 26.04, Telegraf "permission denied" on container mounts, CrowdSec enroll 401...) is
listed in `CLAUDE.md` ("Hard-won gotchas" and "Expected audit result").

## Read first

From `origin/main`: `CLAUDE.md` (script conventions and the "Hard-won gotchas" table: never bring one back), then
`CONTRIBUTING.md` and `SECURITY.md`. For pull requests, also `.github/pull_request_template.md`. Read them with
`git -C <main clone> show origin/main:<path>`, never from a pull request.

## Machine safety

This machine is a real server: it runs GitHub runners and deployed apps, and the routine user is in the `docker` and
`lxd` groups, which act as root. Never use sudo, docker, docker compose, podman, lxc/lxd, ufw, iptables, nft, ip (except
`ip a` / `ip r`), systemctl (except status, is-active, show), crontab, apt, dpkg, snap, mount or qemu. Never run
`server-prep.sh` or `server-preconfig.sh` with sudo or `--dry-run` (even a dry run needs root), never in a way that
reaches a real run, and never run `tests/e2e/` (it boots virtual machines).

## Safe commands

- `./server-prep.sh --help`, `./server-prep.sh --list-steps`, `./server-preconfig.sh --help`, `./server-audit.sh --help`.
- `./server-prep.sh --config <file> --validate` (no root, reads the file without running it).
- `./server-audit.sh --no-network --no-txt --quiet --json <tmp>/audit.json` without sudo (read-only, partial results).
- The CI test scripts in `tests/*.sh` (they stub every function that touches the host; when a change makes `main()` call
  a new host-touching function, check the test stubs it before running it).
- Linter: use the pinned ShellCheck at `<harness_dir>/tools/shellcheck` (0.10.0) in place of `shellcheck`.
- `scripts/gen-data.sh` (regenerates `site/data.json` and `site/data.js`), `scripts/check-tokens.sh`.
- Static checks on pull request files, read from git without running them: `git show <sha>:<file> | bash -n` and
  `git show <sha>:<file> | <harness_dir>/tools/shellcheck -S warning -s bash -`.

## CI checks

From the worktree, run every `run:` command of `.github/workflows/lint.yml` except `sudo`/`apt` lines, with the pinned
ShellCheck: `bash -n` and `shellcheck -S warning` on the file list, the `--help` loop, `scripts/gen-data.sh --check`,
`scripts/check-tokens.sh`, `tests/exit-status.sh`, `tests/swap.sh`, `tests/e2e-report.sh`, `tests/e2e-pages.sh`.

Mechanical failures a routine may fix by itself: a ShellCheck version difference (the pinned 0.10.0 against CI's), and
site data out of date (`scripts/gen-data.sh --check` fails: run `scripts/gen-data.sh` and commit the result).

## Protected paths

`.github/workflows/`, `.github/actions/`, `.github/dependabot.yml`, `.claude/settings*.json`, `.claude/hooks/`, `.mcp.json`.

## Release

Maintainers release with the `release` workflow (`gh workflow run release -f bump=patch|minor|major`); it bumps
`PREP_VERSION`, moves the changelog and tags. Routines never change `PREP_VERSION` or `AUDIT_VERSION` and never tag.
Users update a downloaded copy with `sudo ./server-prep.sh --upgrade` (checks every file against the release's
`SHA256SUMS`) or `git pull`; the audit check `upd.server_prep` says when a newer release fixes a security problem. A
security fix's changelog line starts with `**Security fix:**` and names the step to re-run:
`sudo ./server-prep.sh --config /etc/server-prep/server-prep.conf --only <step> --yes`.

## Conventions

The full list is in `CLAUDE.md` ("Script conventions" and "Hard-won gotchas"). The essentials:
- Every system change goes through `run` (dry-run aware), `run_secret` (tokens), `write_file`, `set_kv`, `backup_file`,
  `pkg_install` (installs only what is missing), `svc_disable`. No side effect on import.
- A step is `step_<name>()`, registered in `ALL_STEPS` and the `run_step` list, idempotent (a second run changes nothing).
- apt always with `"${APT_OPTS[@]}"`. Third-party repos: key fingerprint checked, `signed-by`, apt pin at 900.
- Downloads: pinned version and SHA-256.
- Panel-specific code behind `[[ ${PANEL,,} == <name> ]]`.
- A new or changed step also updates `server-prep.conf.example`, the README step table and an audit check (INFO when
  optional), then `scripts/gen-data.sh` regenerates `site/data.json` and `site/data.js`.
- Supported systems: Debian 12/13, Ubuntu 22.04/24.04/26.04 (sudo-rs on 26.04).

## Code review checklist

- Bash correctness: quoting, word splitting and globbing, `set -u`/`set -e` behaviour, return codes, arrays, `local`,
  subshell pitfalls.
- Conventions above (helpers, idempotency, apt options, repos, pins, panel guards) and no regression of a
  `CLAUDE.md` gotcha.
- Differences between Debian 12/13 and Ubuntu 22.04/24.04/26.04 (package names, sudo-rs, service names, paths).
- Completeness: config example, README step table, audit check, site data, a `CHANGELOG.md` line under `[Unreleased]`
  for a user-visible change, an e2e assertion in `tests/e2e/scenarios.sh` for a new step or behaviour.

## Security review checklist

1. Command and code injection: `eval`; `bash -c`/`sh -c`/`su -c`/`ssh host "..."` built from variables; unquoted
   expansions in commands; values from configs, prompts, the network or the environment reaching a shell.
2. Remote code and supply chain: `curl | bash`; downloads without a pinned version and SHA-256; apt repos without a
   checked fingerprint, `signed-by` or pin.
3. Files and secrets: predictable `/tmp` paths instead of `mktemp`, symlink races, secret files (InfluxDB or Telegram
   token, CrowdSec key, private keys) not root-owned 600/640, umask, secrets in logs, on screen or in `ps`
   (`run_secret`).
4. Hardening regressions and lockout: SSH (PermitRootLogin, PasswordAuthentication, AllowUsers, a port change without the
   firewall), firewall rules that open ports or let Docker bypass UFW, sudoers NOPASSWD, disabling auditd, AppArmor,
   unattended-upgrades or CrowdSec, weaker sysctl values, anything that can lock the admin out.
5. Automation surface: `.github/workflows` changes (`pull_request_target`, `${{ github.event.* }}` inside `run:`, secrets
   exposure, write permissions).
6. Privacy: real IPs, hostnames, emails, tokens or client names in the diff.

## Vulnerabilities

Exploitable, so a private advisory: an admin lockout, a port left open, root login allowed, command injection, secrets
readable by other users, a check that passes while the server is exposed. A safer default or an extra check that is not
exploitable today is a public hardening idea labelled `security`.

## Labels

- Type: `bug`, `enhancement`, `documentation`, `security` (release notes group by them), `skip-changelog`.
- Priority: `priority: critical` (breaks servers or security now: fix first, hotfix lane), `priority: high` (needed for
  the current phase), `priority: medium`, `priority: low`. Size: `size: S` (under a day), `size: M` (1 to 3 days),
  `size: L` (more than 3 days, may be split).
- Areas from changed paths: `server-prep.sh`, `server-prep.conf.example` -> `area: prep`; `server-audit.sh` -> `area: audit`;
  `server-preconfig.sh`, `server-preconfig.md` -> `area: preconfig`; `docs/`, `README.md`, examples -> `area: docs`
  (`CHANGELOG.md` alone does not count); `AGENTS.md`, `CLAUDE.md`, `CLAUDE.local.md.example`, `.claude/` -> `area: agents`;
  `.github/workflows/`, `.github/actions/`, `tests/`, `scripts/`, lint or editor config (`.editorconfig`,
  `.shellcheckrc`) -> `area: ci`; `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  `.github/ISSUE_TEMPLATE/`, `.github/DISCUSSION_TEMPLATE/`, `.github/pull_request_template.md`, `wiki/`, governance files ->
  `area: community`; `site/` -> `area: site`; `extras/` -> `area: extras`. Panel-specific: `panel: coolify`,
  `panel: dokploy`, `panel: openship`.
- Kept away from agents: `area: ci` issues usually need `.github/workflows/` edits (a protected path): the issue
  developer skips them.
- Project board: the organisation project "server-prep roadmap" (number 7), field Status with Backlog, Ready,
  In progress, In review, Done.

## Milestones

Bugs and documentation fixes go to "Next patch release". Features go to the phase ("Phase <N>: ...") whose description
covers them; a sub-issue takes its parent's milestone. The issue developer works "Next patch release" first, then the
phases in number order, then issues without a milestone. Never create, rename or close a milestone.

## Commits and pull requests

- Title: `<script or area>: <what changes>`; it becomes the release-note line.
- A user-visible change adds a line under `## [Unreleased]` in `CHANGELOG.md`, in simple words ("Fix: ..." for a bug).
  User-visible files: `server-*.sh`, `server-prep.conf.example`, `extras/`, `docs/`, `README.md`. A pull request that
  touches only internal files (`tests/`, `scripts/`, `.github/`, `.claude/`, `site/` data, `wiki/`) gets `skip-changelog`
  instead.
- The body follows `.github/pull_request_template.md` and says what was tested; no dry run or real run was done by a
  routine (they need root): say so and list what the maintainer should test on a test server.
- Generated files: after changing a step, a setting, an audit check or the README tables, run `scripts/gen-data.sh`.
- When resolving conflicts: `CHANGELOG.md` keeps both sides (the default branch's lines first) under `[Unreleased]`;
  regenerate `site/data.json`/`site/data.js` instead of merging them; README tables keep the rows of both sides.
- Branch prefixes: `claude/fix-<n>-...`, `claude/feat-<n>-...`, `claude/docs-<n>-...`, `claude/hotfix-<n>-...` for the
  routines; `fix/`, `feat/`, `docs/`, `hotfix/` for people.

## CI workflows

- `lint.yml`: the required check (`lint`).
- `e2e.yml` (display name "E2E"): end-to-end tests. Each system (debian-12, debian-13, ubuntu-22.04, ubuntu-24.04,
  ubuntu-26.04) boots its cloud image in a QEMU VM and runs the scripts over SSH. Jobs: `setup`, one job per system named
  after it (`debian-12`...), and `report`. In a system's job, the step `Scenarios` runs the tests and `Upload the results`
  uploads them. Artifact `e2e-vm-<os>`: `results.json` (scenarios and assertions; a failed assertion is a line starting
  with `not ok:`), `harness.log`, `server-prep-runs.log`, and `journal.log` (read with grep only). Fixes to the tests go in
  `tests/e2e/`. Flake issues are titled `e2e flake: <signature>`. The report is published on GitHub Pages. Not a required
  check.
- CodeQL default setup (not a routine's job).
- The default branch counts as red when the latest completed `lint.yml` run on it failed (once), or `e2e.yml` failed twice
  in a row.

## Bug hunting areas

1. `server-prep.sh` steps update, users, docker, firewall (UFW, ufw-docker).
2. `server-prep.sh` steps ssh, ips, unattended, sysctl, auth.
3. `server-prep.sh` steps services, laptop, logging, auditd, rkhunter, aide, endlessh.
4. `server-prep.sh` steps telegraf, telegram, cloudflared, suid; config loading, argument parsing, the report, dry-run.
5. `server-audit.sh`: every check (wrong PASS/WARN/FAIL, a step without a check, exit code, JSON/TSV output).
6. `server-preconfig.sh`, `extras/`, and consistency between the README step table, the config example, the audit checks,
   the docs and the code.

Look for: changes that bypass the helpers (dry-run leaks), apt without `APT_OPTS`, steps that are not idempotent,
quoting and exit-code bugs, Debian/Ubuntu differences, repos without fingerprint/signed-by/pin, downloads without a pin
and checksum, unguarded panel code, gotcha regressions, audit checks that disagree with the step, anything that could lock
the admin out. Prove a bug with a small non-root harness that sources one function with the helpers stubbed.

## Market research

Users: people deploying apps with a self-hosted panel on a VPS or their own server, often without DevOps experience.
Watch: the panels Coolify, Dokploy, Openship, CapRover, Dokku (release notes, server requirements, setup and security
issues); the tools server-prep installs: CrowdSec, Docker, UFW and ufw-docker, fail2ban, endlessh, Telegraf and
InfluxDB, Tailscale, cloudflared; the systems: Debian and Ubuntu releases and end of life, sudo-rs, OpenSSH defaults,
nftables versus iptables, systemd, unattended-upgrades. Similar tools to compare with: Lynis, vps-audit, CIS benchmarks,
dev-sec, ubuntu-cis. Where users talk: r/selfhosted, r/coolify, r/homelab, Hacker News, the panels' GitHub issues and
discussions. In scope: securing and preparing a
Debian/Ubuntu server for a panel and proving it with the audit. Out of scope: managing apps, other operating systems,
Kubernetes.

## Public examples

Hosts `web-01`, `web-02`; IPs `192.168.1.50`, `203.0.113.10`, `198.51.100.x`; domain `example.com`; user `admin`.
