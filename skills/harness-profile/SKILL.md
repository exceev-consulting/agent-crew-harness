---
name: harness-profile
description: Draft or review the PROFILE.md of a repository for the agent harness - read the repository's docs, CI and code, then write every required section with the user. Use when the user asks to write, update or check the harness profile of a project.
---

# Draft a project profile

PROFILE.md tells every routine what is specific to one project. Its sections and their purpose are in `docs/profile.md`
of the harness repository (two levels above this skill). The section titles are fixed: routines refer to them by name.
`profiles/server-prep/PROFILE.md` and `profiles/agent-crew-harness/PROFILE.md` are complete examples.

1. Read, from the target repository's default branch: README, CLAUDE.md or AGENTS.md, CONTRIBUTING.md, SECURITY.md,
   the pull request template, `.github/workflows/*`, the issue templates, the label list (`gh label list`), the
   milestones (`gh api repos/<repo>/milestones`), the release process, and the main code paths (`git ls-files`).
2. Draft each section from what you read. Prefer exact facts: commands ready to copy, file names, label names. Where
   the repository says nothing, write your best proposal and mark it `(proposed)`.
3. Machine safety deserves the most care. Ask the user what else runs on the machine that hosts the routines (deployed
   apps, CI runners, databases) and which project commands touch the host or need root. When unsure, forbid.
4. Go through the draft with the user, one section at a time. Remove every `(proposed)` they confirm.
5. Check: no secret, real host, private IP or client name (use the Public examples section). Every section present, in
   the order of `docs/profile.md`. Size under about 8 KB.
6. Write the result where the user asks: `<harness_dir>/PROFILE.md` for an install, or `profiles/<name>/PROFILE.md` in
   the harness repository to share it.
