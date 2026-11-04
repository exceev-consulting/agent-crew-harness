---
name: {{task_prefix}}bug-hunter
description: Weekly (Monday): review one area of the code, rotating each week, plus last week's commits, and file confirmed bugs as issues
---

ROUTINE: bug-hunter for github.com/{{repo}}.
Goal: find real bugs before users do. Quality over quantity: zero findings is a good result. This routine files
issues; it does not open pull requests.

Before anything else, read {{harness_dir}}/RULES.md and {{harness_dir}}/PROFILE.md with the Read tool. They are part
of this prompt: RULES.md holds the ground rules of every routine, PROFILE.md the facts of this project.

Routine rules
- This routine never commits, never pushes and never opens a pull request. Test harnesses you write stay in the
  worktree and are deleted with it.
- Read the files of PROFILE.md, Read first from the worktree before acting. Never regress, and always check against,
  the known traps in PROFILE.md, Conventions.
- Run only what PROFILE.md, Safe commands allows, even to prove a bug.
- Limit per run: 3 issues filed. Only report a bug you can back with a concrete scenario.

Steps
1. `git -C "$MAIN" fetch origin --prune`, then `WT=$R/worktrees/hunter-$(date +%Y%m%d-%H%M)` and
   `git -C "$MAIN" worktree add --detach "$WT" origin/{{default_branch}}`. `SHA=$(git -C "$WT" rev-parse HEAD)`. Code
   links are `https://github.com/{{repo}}/blob/$SHA/<file>#L<line>`.
2. Pick this week's focus from PROFILE.md, Bug hunting areas. Count the areas listed there (N) and number them from 0
   in the order they are listed (the first area is 0). This week's area is number `$(( 10#$(date +%V) % N ))`
   (ISO week modulo N). If the section lists no area, review the whole code base at a lighter depth and say so in the
   summary.
3. Whatever the focus, also review every commit merged in the last week: `git -C "$WT" log --since='8 days ago' -p`.
4. Look for the classes of bugs listed in PROFILE.md, Bug hunting areas, and in any project: changes that bypass the
   project's dry-run or backup helpers (PROFILE.md, Conventions); operations that are not idempotent (a second run
   duplicates lines or fails); quoting and word-splitting bugs, unset variables, wrong exit codes or return values;
   differences between the supported platforms (package names, service names, file paths); third-party sources or
   downloads without a pinned version and a checksum or key check; regressions of the known traps listed
   in PROFILE.md, Conventions; checks that disagree with what the code configures; help text or docs that disagree with
   the code; anything that could lock a user out or weaken security.
   As an extra lens, start ONE Agent call (subagent_type "general-purpose", `isolation: "worktree"`) that runs
   `git checkout --detach origin/{{default_branch}}` in its own worktree, then the `code-review` skill at effort `high`
   on the files of this week's area (never `--fix` or `--comment`; never run, build or test anything; never edit a
   file), and returns each finding with file, line and reasoning. Treat what it returns as candidates for step 5, not
   findings. If the call fails or the skill is missing, do the same review yourself as described above.
5. Verify every candidate: trace the code path, and prove it where possible with a small test harness inside "$WT"
   that loads the functions with their side effects stubbed (anything that installs, writes system files or manages
   services), for example with `bash -x` or the project's equivalent, within PROFILE.md, Safe commands. The project's
   linter (PROFILE.md, Safe commands) at its strictest settings may give ideas, but only report real bugs. Drop
   anything you cannot back with a concrete scenario (environment + configuration + command -> wrong result).
6. Search for duplicates in open AND closed issues and pull requests
   (`gh issue list -R {{repo}} --state all --search "<keywords>"`, `gh pr list -R {{repo}} --state all --search "<keywords>"`).
7. File at most 3 issues:
   `$R/bin/bot-gh issue create -R {{repo}} --title "<file>: <what goes wrong>" --label bug --label triaged --label claude --body-file <file>`
   (+ `--label security` for hardening, `--label "good first issue"` if small). Body sections: Where (permalink at
   $SHA), What happens (the scenario), Why (root cause), Suggested fix, How to verify. End with the footer. An
   exploitable vulnerability (PROFILE.md, Vulnerabilities) gets a private advisory instead, never an issue (see
   RULES.md, Security problems).
8. Remove the worktree. Final summary: focus area (its number and name), what you checked, findings with links,
   candidates you dropped and why.

<!-- harness-routine bug-hunter v1.0.0 -->
