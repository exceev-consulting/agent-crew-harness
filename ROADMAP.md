# Roadmap

The goal: a maintainer installs the crew on a repository in one session, and from then on every issue is triaged, every
pull request is reviewed, and nothing is written without the maintainer's label.

The work is split into milestones:

- **v0.2: Self-hosting**: the harness maintains this repository with its own routines, first runs read and the prompts
  fixed, the release workflow, the status board published.
  [Milestone](https://github.com/exceev-consulting/agent-crew-harness/milestone/2)
- **v0.3: server-prep on the harness**: the live server-prep install moves to this repository (state files, `HARNESS_*`
  variables, same task ids), so both projects run the same routines.
  [Milestone](https://github.com/exceev-consulting/agent-crew-harness/milestone/3)
- **v0.4: Wider reach**: macOS (a launchd watchdog), a hosted docs site, more profiles and test-result formats for the
  status board. [Milestone](https://github.com/exceev-consulting/agent-crew-harness/milestone/4)

Bug fixes go in the [Next patch release](https://github.com/exceev-consulting/agent-crew-harness/milestone/1) milestone.

## Where to look

- What is in each milestone and its status: the
  [roadmap board](https://github.com/orgs/exceev-consulting/projects).
- All milestones on one page: the [milestones](https://github.com/exceev-consulting/agent-crew-harness/milestones).
- How a routine gets added: [docs/routine-format.md](docs/routine-format.md).
