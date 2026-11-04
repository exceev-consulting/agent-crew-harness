# Maintaining this repository with itself

The harness is maintained by its own routines, installed for this repository with
[`profiles/agent-harness/PROFILE.md`](../profiles/agent-harness/PROFILE.md). It is the first and strictest test of every
change: a routine that would misbehave on your project misbehaves here first.

## Setup

Same as any project: ask the `harness-install` skill to install the harness for this repository and choose the
`agent-harness` profile. Use a separate `task_prefix` (for example `agent-harness-`) and `harness_dir` when the same
machine also runs the harness for another project.

## The one trap

The install is a copy of this repository. A routine working on this repository must never touch the running install:
PROFILE.md, Machine safety forbids writing to `harness_dir` (outside its scratch folders) and `tasks_dir`, running the
installer, or rendering into the install. Changes reach the install only when a maintainer merges, pulls and runs the
installer's update.

## Reviewing changes to routines

A pull request that changes `core/RULES.md`, a routine's "Routine rules", `bin/bot-gh`, `bin/review-gh` or
`bin/scan-private` changes what an agent may do. It carries the `security` label and its first line says what an agent
can do after the change that it could not do before. pr-review checks exactly that (PROFILE.md, Security review checklist).

Routine versions: a change bumps the routine's version (`routine.json` and the last line of its `SKILL.md`) and adds a
line to `CHANGELOG.md`. `bin/harness-render --lint` fails when the two versions disagree.
