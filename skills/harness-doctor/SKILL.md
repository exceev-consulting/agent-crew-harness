---
name: harness-doctor
description: Check an installed agent harness and explain how to fix each problem - settings, secrets, private-data guard, rendered prompts, routine versions, tests, watchdog, freshness of the sentinel and security watch. Use when the user asks whether the routines are healthy, why a routine did not run, or after an install or update.
---

# Check the harness

1. Find the install: ask for `harness_dir` if it is not obvious (`~/.cache/*-harness/harness.json`).
2. Run `<harness_dir>/bin/harness-doctor` and show its output.
3. Run `HARNESS_CONFIG=<harness_dir>/harness.json <harness repository>/bin/harness-render --status` to show which
   routines are behind the repository.
4. For each FAIL, then each WARN, give the cause and the exact command or app action that fixes it, in one or two lines.
   Common ones:
   - templates drift: a prompt was edited in the app; either keep the edit (copy it into the routine's template in the
     harness repository, bump its version) or re-install it with the `harness-install` skill (update).
   - a secret file missing: re-run `bin/bot-setup` or `bin/notify --setup` (the user runs it in a terminal).
   - the guard does not block its canary: the pattern file lost the canary line.
   - watchdog timer inactive: `systemctl --user enable --now <task_prefix>watchdog.timer`.
   - sentinel or security watch stale: the Claude app was closed or asleep, a usage limit stopped runs, or a run waits on a
     permission prompt (open it in the app).
5. Never read secret files, never print tokens, and change nothing without the user's yes.
