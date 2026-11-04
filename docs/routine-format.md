# Writing a routine

A routine is a folder `routines/<name>/` with two files.

## routine.json

```json
{
  "name": "pr-review",
  "title": "PR review",
  "description": "One line: what it does and how often.",
  "cron": "7 11,15,18,22 * * *",
  "enabled_by_default": true,
  "requires": ["bot_app", "review_app"],
  "notes": "Optional: anything the installer should tell the user."
}
```

`requires` lists what the routine cannot work without; `optional` what it uses when present and skips otherwise. Both
take: `bot_app`, `review_app`, `telegram`, `workflow` (the routine runs `workflows/develop-issue.js` in ultracode mode),
`org_projects` (the app needs the organisation permission Projects), `issue_fields` (organisation issue fields),
`actions_write` (the app re-runs workflows), `artifact` (a published Claude artifact, such as the status board). `skills` lists the Claude Code skills it calls (read-only skills only run
in an isolated subagent: RULES.md).

## SKILL.md

A template rendered at install time with the values of `harness.json` (`{{repo}}`, `{{harness_dir}}`...: the list is in
`bin/harness-render`). Shape:

```markdown
---
name: {{task_prefix}}<name>
description: <one line>
---

ROUTINE: <name> for github.com/{{repo}}.
Goal: <one or two sentences>.

Before anything else, read {{harness_dir}}/RULES.md and {{harness_dir}}/PROFILE.md with the Read tool. They are part
of this prompt: RULES.md holds the ground rules of every routine, PROFILE.md the facts of this project.

Routine rules
- <only what is specific to this routine, or stricter than RULES.md>

Steps
1. ...
```

Rules for a good routine:

- **Generic.** No project names, paths, people or tools in the prompt. Project facts come from PROFILE.md, named by
  section with this exact phrasing: `PROFILE.md, <Section>` (for example `PROFILE.md, CI checks`). The section titles are
  listed in [profile.md](profile.md). Identity comes from the placeholders.
- **No repetition of RULES.md.** Identity, untrusted input, private context, worktrees, locks, never pushing to the default
  branch: all in RULES.md already.
- **Deterministic where possible.** When a decision can be made by a script (what is new, what to notify, what is stale),
  write a helper in `bin/` with tests, and let the prompt carry out its plan.
- **Markers.** Comments a routine posts carry a marker `<!-- <name>-routine ... -->` so other routines (and the routine
  itself, next run) can find them without parsing prose.
- **Limits.** Every loop has a cap per run (at most N issues, N pull requests) and a cooldown or state file, so a bad run
  cannot flood the repository.
- **Two keys.** No routine writes code for an issue a maintainer has not labelled `agent-ready` or `ready`.
- `bin/harness-render --lint` must pass.
