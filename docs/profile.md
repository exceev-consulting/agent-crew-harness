# PROFILE.md: what the routines need to know about your project

`PROFILE.md` lives in the harness folder (`harness_dir`). Every routine reads it at the start of each run, together with
`RULES.md`. It holds everything that is specific to your project, so the routine prompts stay generic.

Write it in plain Markdown with these `##` sections, in this order and with these exact titles: the routines refer to them
by name ("PROFILE.md, Safe commands"). A section that does not apply says so in one line ("None."). Start from
[`profiles/blank/PROFILE.md`](../profiles/blank/PROFILE.md), or ask the `/harness-profile` skill to draft it from your
repository. [`profiles/server-prep/PROFILE.md`](../profiles/server-prep/PROFILE.md) is a complete example.

| Section | What to write | Used by |
|---|---|---|
| Project | Two or three sentences: what the project does, for whom, languages, and what a mistake costs users. Then what a bug report must include (environment, version, the command, the output) and where known behaviour is documented. | all |
| Read first | Files every routine reads from `origin/<default branch>` before acting (CLAUDE.md, CONTRIBUTING.md, SECURITY.md...), and which parts matter most. | all |
| Machine safety | What else runs on this machine, and the commands that are forbidden even though they would work (docker, systemctl, the project's own installer...). | all |
| Safe commands | The project commands a routine may run here (tests, linters, `--help`), with any tool path to use (a pinned linter binary). | developer, fixers, hunter |
| CI checks | The exact commands to run before a push, so a pull request does not fail CI. Usually "every `run:` command of `.github/workflows/<file>` except ...". | developer, fixers |
| Protected paths | Paths a routine must never create or edit (workflow files, agent settings, hooks...). | developer, fixers |
| Release | How releases happen, and what routines must never touch (version variables, tags). | all writers |
| Conventions | The coding rules that a change must follow, and where the full list lives. Keep the hard-won traps here or point to them. | developer, fixers, reviews |
| Code review checklist | What a code review checks in this project, beyond "does it work". | reviews |
| Security review checklist | The attack surface: inputs, privileges, supply chain, secrets, and what a weakening looks like here. | reviews, security watch |
| Vulnerabilities | What counts as an exploitable vulnerability (a private advisory) versus a public hardening idea. | all |
| Labels | Type, priority and size labels with their meaning, area labels and how to pick them, labels owned by routines. | triage, metadata |
| Milestones | How issues are placed in milestones, the one for bug fixes, and the order the developer follows. | triage, developer |
| Commits and pull requests | Title format, changelog rule, PR template, branch prefixes, trailers. | developer, fixers |
| CI workflows | The workflow files, which check is required, the end-to-end workflow and its artifacts (for the CI doctor), and what "main is red" means. | CI doctor, sentinel |
| Bug hunting areas | A rotation of areas to review, one per week, and the classes of bugs to look for. | bug hunter |
| Market research | Who the users are, the upstream projects and competitors to watch, what is in and out of scope. | market research |
| Public examples | Placeholder hosts, IPs, domains and names to use in public text instead of real ones. | all |

The security watch reads its feeds from a separate file, `security-watch.json` (see
[security-watch.md](security-watch.md)), because they are data, not prose.

## Tips

- Write facts and rules, not wishes: "never run `install.sh`, even with `--dry-run`: it needs root" beats "be careful".
- Name commands exactly, ready to copy.
- Keep it short: routines read it every run. 3 to 8 KB is a good size. Point to longer documents in your repository.
- Never put secrets, real hostnames or private IPs in it.
