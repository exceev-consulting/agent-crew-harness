# Security policy

The harness gives AI agents write access to a repository. A flaw here can let an outsider make an agent write code, post
as the app, leak a secret or private data, or run a command on the maintainer's machine.

## Report a vulnerability

Use **Report a vulnerability** in the Security tab of this repository (a private advisory). Do not open a public issue.
Include what an attacker controls, what the agent then does, and the routine or helper involved. We try to answer within
7 days and credit you in the release notes unless you prefer not.

## Supported versions

The latest release and `main`. Routines are versioned individually: the advisory names the routine versions affected.

## In scope

Prompt injection that leads a routine to act, any way around the two-key rule, the private-data guard or the app
identity, secrets exposed by a helper (command line, logs, messages), unsafe defaults in the installer.

## Out of scope

Claude Code itself, GitHub, Telegram, and the security of the machine the harness runs on. Report those to their owners.
