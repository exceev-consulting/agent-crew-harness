---
name: harness-install
description: Install or update the agent harness for one GitHub repository - settings, GitHub Apps, project profile, labels, Telegram, watchdog, and one scheduled task per routine (rendered from the templates, versioned). Use when the user asks to install, set up, update or upgrade the routines harness, or to add or remove a routine.
---

# Install or update the agent harness

You install the routines of this repository (the harness repository: the folder that holds this skill, two levels up,
called HREPO below) for one target GitHub repository, on this machine. The user is here: ask, explain in one line why,
and wait for answers. Never type a secret yourself and never ask the user to paste one in the chat: secrets go into the
helpers' own prompts (`bin/notify --setup`, `bin/bot-setup`), which the user runs in a terminal.

Work in this order. Say at each step what you do and what the user must do. Skip a step that is already done (the
doctor tells you). Before anything that writes outside the harness folders (GitHub labels, systemd units, linger,
scheduled tasks), say exactly what will change and get a yes.

## 0. Preconditions

- Linux with `systemd --user` (the watchdog), `git`, `gh` (logged in: `gh auth status`), `jq`, `curl`, `python3`,
  `openssl`, `node` (to check the workflow script). Report what is missing with the install command.
- Scheduled tasks are created in the permission mode of this session. Unattended routines need Bypass permissions (or an
  equivalent allow list), and only a session the user typed in can create them that way: if this session is in a lower
  mode, say so, and stop before step 9 until the user has switched.
- Unattended runs cannot start other scheduled tasks (the app refuses `run_scheduled_task` without a person): routines
  run on their own schedules only.

## 1. Settings (`harness.json`)

Ask, with a default for each:
- target repository `owner/name`, its default branch, the local clone (must exist; offer `gh repo clone`);
- `harness_dir` (default `~/.cache/<name>-harness`), `secrets_dir` (default `~/.config/<name>-harness`),
  `tasks_dir` (`~/.claude/scheduled-tasks`), `task_prefix` (default `<name>-`);
- maintainer logins (the person who merges, and a second one if any), the git author of the clone
  (`git -C <clone> config user.name` / `user.email`, and whether commits are signed);
- the GitHub App names (main app and reviewer app, default `<name>-claude` and `<name>-review`), a canary string
  (random, e.g. `<NAME>-CANARY-<4 hex>`), the desktop app process name (`claude-desktop` on Linux).

Write `<harness_dir>/harness.json` (see `HREPO/harness.example.json`; set `harness_repo` to HREPO). Then copy the code:
`rsync -a --delete HREPO/bin/ <harness_dir>/bin/` and the same for `lib/`; copy `HREPO/VERSION`. Never delete
`<harness_dir>/state`, `locks`, `worktrees`, `tmp` or `tools` (pinned tools the profile names, such as a linter at a
fixed version: install them there, never in `bin/`).

## 2. Project profile (`PROFILE.md`)

If `HREPO/profiles/<name>/PROFILE.md` exists, offer it. Otherwise run the `harness-profile` skill to draft one from the
target repository, and go through it section by section with the user. Copy the result to `<harness_dir>/PROFILE.md`.
Settings of the sentinel and the security watch: copy `HREPO/profiles/<name>/sentinel.json` and `security-watch.json`
when they exist, else `HREPO/config/*.example.json`, to `<harness_dir>/` without `.example`, and adapt with the user
(the workflow names in `main_workflows`, the components the project depends on).

## 3. GitHub Apps

The routines post as a GitHub App, never as a person. For each app (main, then reviewer):
1. `HREPO/bin/app-manifest --main <tmp>/main.html` (add `--projects` if the user wants the project-board step), open it
   in the browser for the user. They click through on GitHub.
2. The user runs, in a terminal: `<harness_dir>/bin/bot-setup '<the address GitHub redirected to>'`
   (`bot-setup --review` for the reviewer app). It saves the key in `secrets_dir`, never prints it, and tests the app.
3. The user installs the app on the target repository only.
Record the main app's bot user id in `harness.json` (`gh api users/<bot_app>%5Bbot%5D --jq .id`).

## 4. Private-data guard

`<secrets_dir>/private-patterns.txt` holds one extended regular expression per line for what must never be published:
the user's real hosts, IPs, client names, local paths. Draft it from what you can see locally (`CLAUDE.local.md`, the
user's memory notes, `hostname`, private IP ranges in use), show it, and let the user edit it. Add the canary from
`harness.json` as a line. Permissions 600. Check: `echo <canary> | <harness_dir>/bin/scan-private` exits 4, and
`echo hello | <harness_dir>/bin/scan-private` exits 0.

## 5. Labels

The routines use a standard label set (docs/labels.md in HREPO) plus the area labels of PROFILE.md. List the labels
missing in the target repository (`gh label list`), show them, and on a yes create them with
`gh label create <name> --color <hex> --description <text>` (the user's login: this is setup, not a routine).

## 6. Telegram (optional)

The sentinel, the security watch and the watchdog send notifications through `bin/notify`. Explain the setup in
`HREPO/docs/telegram.md` (BotFather, then the user runs `<harness_dir>/bin/notify --setup` in a terminal and presses
Start in the chat). Check with `<harness_dir>/bin/notify --status`. Quiet hours: `TELEGRAM_QUIET_HOURS` in
`<secrets_dir>/telegram.env` (default 23-7).

## 7. Render

`HARNESS_CONFIG=<harness_dir>/harness.json HREPO/bin/harness-render --render <harness_dir>` writes `RULES.md`,
`workflows/`, `systemd/` units, `tasks/<task_prefix><name>/prompt.md` for each routine and `installed.json`. Run
`HREPO/bin/harness-render --lint` first: never install a template that fails it.

## 8. Choose the routines

Show `HREPO/bin/harness-render --list` with each routine's `requires`, and suggest:
- always: issue-triage, pr-review, pr-metadata, review-fixer, conflict-fixer, sentinel;
- when the user labels issues `agent-ready`: issue-developer, hotfix-developer, hotfix-review;
- when Telegram is set up: security-watch (adapt `security-watch.json` first);
- optional: bug-hunter, bug-fixer, market-research, ci-doctor (needs a long CI workflow in PROFILE.md, CI workflows).
Never enable a routine whose `requires` is not met (no reviewer app: no pr-review; no `workflow` support: no developer).
`optional` features only lose a step when missing (no Telegram: the sentinel still sends desktop alerts and opens issues).

## 9. Scheduled tasks

For each chosen routine, with its `routine.json` (title, description, cron) and its rendered `prompt.md`:
- new: `create_scheduled_task` with `taskId` = `<task_prefix><name>`, `title` = `<project>: <title>`, `description`,
  `cronExpression` = `cron`, `prompt` = the content of `prompt.md`, `notifyOnCompletion` false;
- existing (update): `update_scheduled_task` with the new `prompt` and `description` (and `cronExpression` only if the
  user did not change the schedule in the app).
Then `HARNESS_CONFIG=<harness_dir>/harness.json HREPO/bin/harness-render --check` must say the install matches.

## 10. Watchdog

On a yes: copy `<harness_dir>/systemd/*` to `~/.config/systemd/user/`, `systemctl --user daemon-reload`,
`systemctl --user enable --now <task_prefix>watchdog.timer`, and `loginctl enable-linger "$USER"` so it runs while the
user is logged out. It alerts on Telegram when the Claude app is down or the sentinel or security watch stopped.

## 11. Doctor

`<harness_dir>/bin/harness-doctor` must end with 0 FAIL. Explain each WARN in one line. Finish with: the routines
installed and their versions, what the user still has to do, and where the docs are.

## Updating

When the user updates (after `git -C HREPO pull`): show `HARNESS_CONFIG=<harness_dir>/harness.json
HREPO/bin/harness-render --status` (routine versions installed and available), the `CHANGELOG.md` entries in between, and
any change to `core/RULES.md`. On a yes, redo steps 1 (code copy only), 7, 9 (update only the routines whose version
changed, plus all of them when RULES.md changed: their prompts did not, but say that every run now reads the new rules)
and 11. Never overwrite `PROFILE.md`, `harness.json`, `sentinel.json` or `security-watch.json` without showing the diff.
