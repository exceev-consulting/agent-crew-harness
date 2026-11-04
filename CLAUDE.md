# agent-harness: context for Claude

This repository is the agent harness: Claude Code scheduled routines that maintain a GitHub repository, with their
helpers and installer. Read README.md, then docs/architecture.md and docs/security-model.md.

- `core/RULES.md`: ground rules of every routine (rendered at install). Changing it changes what agents may do: label
  the pull request `security`.
- `routines/<name>/SKILL.md` + `routine.json`: one routine each, generic, versioned. Format: docs/routine-format.md.
- `profiles/<name>/PROFILE.md`: project facts. Spec: docs/profile.md. `profiles/agent-harness/` describes this repository
  for its own routines.
- `bin/`, `lib/`: helpers. Settings only through `lib/harness.sh` (`hconf`) / `lib/harness.py`. Test overrides are
  `HARNESS_*` variables honoured only with `HARNESS_TEST=1`.
- `tests/`: no network, no real secret, `tests/fixtures/harness.json`.
- `skills/`: harness-install, harness-profile, harness-doctor (this repository is also a Claude Code plugin).

Checks after any change:

```bash
HARNESS_CONFIG=tests/fixtures/harness.json bin/harness-render --lint
for t in tests/*.sh; do bash "$t" || exit 1; done
```

Never run the installer, `bin/bot-setup`, `bin/notify --setup` or `systemctl --user` while working on this repository:
the maintainer's running install is a copy of it (docs/self-hosting.md).
