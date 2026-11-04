---
name: {{task_prefix}}pr-metadata
description: Every 3 hours (worker on Claude Sonnet): labels, assignee, milestone and project board status on every open pull request; requests the maintainer's review, and comments and notifies once Claude's review and fixes leave the pull request ready
---

ROUTINE: pr-metadata for github.com/{{repo}}.
Goal: keep every open pull request's metadata accurate so the maintainers can filter and act fast: labels, assignee,
review request, milestone, and its card and status on the project board (PROFILE.md, Labels, line "Project board:"),
based on the contributor and on the pull request itself. Claude reviews first (pr-review routine, run by a different
model from the one that writes the code) and fixes (review-fixer and conflict-fixer routines); the maintainer is
requested as reviewer from the start, and gets one summary comment and one notification only when Claude has nothing
left to do (step 7).

Before anything else, read {{harness_dir}}/RULES.md and {{harness_dir}}/PROFILE.md with the Read tool. They are part
of this prompt: RULES.md holds the ground rules of every routine, PROFILE.md the facts of this project.

How this run works (for the run session only; the worker never sees this section)
- This routine runs on Claude Sonnet, not on the session's own model. You, the run session, do not do the steps
  yourself. Send ONE Agent call (subagent_type "general-purpose", `model: "sonnet"`) whose prompt is the full text of
  this file from the line starting "ROUTINE:" to the end, without this "How this run works" section, with this added at
  its top: "You are the worker of this routine. Do every step except the Notification bullet of step 7. End with the
  final summary of step 9, then a section READY listing the pull requests that became ready in this run (number, short
  title, who must approve, number of fixes, number of threads left for the maintainer)."
- When it returns: if READY is not empty, do the Notification bullet of step 7 yourself from that list (the worker
  cannot send notifications). Then print the worker's summary and the notification result.
- If the Agent call fails, retry it once; if it fails again, report it and stop. Never do the steps yourself on another
  model.

Routine rules
- Apart from the summary comment of step 7, this routine never comments, never edits a title or body, never reviews,
  never closes or merges. It writes no code and needs no worktree: it reads with `gh` and writes only in
  `{{harness_dir}}/state` and `{{harness_dir}}/tmp`. It takes no pull request lock (it only changes metadata), and
  never removes another routine's lock.
- Every change on GitHub (labels, assignees, review requests, milestone, project cards and fields, the step 7 comment)
  goes through `{{harness_dir}}/bin/bot-gh` (called `bot-gh` below).
- Use only labels that already exist (`gh label list -R {{repo}} --limit 200 --json name,description`): never create,
  rename or delete a label.
- Respect people. Never remove a label, assignee, review request or milestone that a person set, except the MANAGED
  labels of step 4, which this routine owns and keeps in sync. Check who did what with
  `gh api repos/{{repo}}/issues/<n>/events --paginate`: if a person (any actor that is not {{bot_app}}[bot] or
  {{review_app}}[bot]) removed a label after it was added, do not add it back unless the pull request's head commit has
  changed since.
- Maintainers (collaborators with admin): {{maintainer}} and {{co_maintainer}}.
- If nothing changed since the last run, say so and stop.
- Limit: at most 15 pull requests processed in steps 3 to 5 per run.

Steps
1. Read the current state:
   - `gh pr list -R {{repo}} --state open --limit 100 --json number,title,author,isDraft,headRefName,headRefOid,labels,assignees,reviewRequests,latestReviews,milestone,mergeable,mergeStateStatus,updatedAt,isCrossRepository`
   - the labels (routine rules) and the milestones (`gh api repos/{{repo}}/milestones --jq '.[] | {number, title}'`).
2. Skip pull requests that did not change (for steps 3 to 5 only: the review-request check of step 4i and steps 6 and 7
   look at every pull request). State file: `{{harness_dir}}/state/pr-metadata-state.json`, one fingerprint per pull
   request = headRefOid + updatedAt + mergeStateStatus + a short summary of the head commit's check results + the id of
   the latest review by {{review_app}}[bot] or {{bot_app}}[bot]. If the fingerprint equals the stored one, skip that pull
   request. Process at most 15 pull requests per run, most recently updated first.
3. For each pull request to process, collect:
   - `gh api repos/{{repo}}/pulls/<n>`: author_association, user.login, user.type, body, additions, deletions, draft.
   - changed files: `gh api repos/{{repo}}/pulls/<n>/files --paginate --jq '.[].filename'`; read the patch
     (`gh pr diff <n> -R {{repo}}`) only when you need it to judge the type or a scope label (step 4c).
   - linked issues: closing keywords in the body (fixes / closes / resolves #<n>). An issue number in the branch name or
     title (for example iss-76 or -77) is only a hint: use it only if that issue clearly matches the change. For each
     linked issue read its labels and milestone (`gh issue view <i> -R {{repo}} --json labels,milestone,title`).
   - checks on the head commit: `gh pr checks <n> -R {{repo}}` (it exits non-zero when checks fail or are pending; read
     its output anyway).
   - CI runs waiting for approval:
     `gh api "repos/{{repo}}/actions/runs?head_sha=<headRefOid>&status=action_required" --jq .total_count`.
   - Claude's reviews: `gh api repos/{{repo}}/pulls/<n>/reviews` → the latest review by {{review_app}}[bot] (the reviewer
     app) or {{bot_app}}[bot] (older reviews) whose body contains `<!-- pr-review-routine head=<headRefOid> -->`, and its
     "Verdict:" line.
4. Decide the metadata:
   a. Type labels (release notes group merged pull requests by them: security, enhancement, bug, documentation;
      skip-changelog leaves a pull request out). If the pull request has none of bug / enhancement / documentation, add
      one: take it from the linked issue when it has one, else judge the change: wrong behaviour fixed → bug; new
      feature, check, option or capability → enhancement; only guides, README or examples → documentation. Add
      `security` too when the pull request fixes a security problem or hardens a default. Add `skip-changelog` only when
      every changed file is internal (the internal files listed in PROFILE.md, Commits and pull requests; without such a
      list: CI workflows, tests, lint or editor config, agent instructions and settings) and nothing changes for users.
      Dependabot pull requests get `dependencies` (and the matching area). Never remove a type label.
   b. Area labels (MANAGED: add and remove so they match the changed files), from the path-to-area mapping of
      PROFILE.md, Labels. A file that matches no area adds nothing. If PROFILE.md, Labels, has no such mapping, skip this
      bullet.
   c. Scope labels (add only): the add-only labels that PROFILE.md, Labels, ties to one part of the project (for example
      one supported platform or integration), when the change is specific to it (code guarded for that part only, or
      text only about it). If there are none, skip this bullet.
   d. Priority (add only): copy the linked issue's `priority: ...` label when the pull request has none. Never invent a
      priority.
   e. `claude` (add only): when the author is {{bot_app}}[bot] or the head branch starts with `claude/`.
   f. `first-time contributor` (add only): when author_association is FIRST_TIME_CONTRIBUTOR or FIRST_TIMER.
   g. Status labels (MANAGED: add when true, remove when false):
      - `needs-ci-approval`: at least one CI run for the head commit is waiting for approval.
      - `ci-failing`: a check on the head commit ended in failure, cancelled or timed_out (pending checks do not count).
      - `needs-rebase`: mergeable is CONFLICTING (mergeStateStatus DIRTY). If mergeable is UNKNOWN, GitHub is still
        computing: leave this label as it is.
      - `needs-changelog`: only when PROFILE.md, Commits and pull requests, has a changelog rule: not a draft, changes
        user-visible files (as that rule defines them), does not touch the changelog file, and has neither
        `skip-changelog` nor `dependencies`. Without a changelog rule it is never true.
      - `stale`: no new commit and no comment from a person for 30 days. Remove it as soon as there is new activity.
      - `review: looks good` / `review: changes suggested` / `review: do not merge`: exactly one of them, from the
        Verdict line (✅ / ⚠️ / ⛔) of the latest Claude review ({{review_app}}[bot] or {{bot_app}}[bot]) of the CURRENT
        head commit. If there is no such review, remove all three.
   h. Assignee (add only, skip if the pull request already has one): a person's pull request → assign its author (if the
      author is not in the assignees after the call, GitHub refused it: leave it); {{bot_app}}[bot] or dependabot pull
      requests → assign {{maintainer}}.
   i. Review request (not for drafts): the review goes to Claude and to the maintainer. Claude's review needs no request
      (the pr-review routine reviews every pull request). The maintainer is requested from the start: if the pull request
      has no pending review request and no review from a maintainer yet, request {{maintainer}}, or {{co_maintainer}}
      when the author is {{maintainer}} (nobody can approve their own pull request). Never re-add a request that the
      person removed themselves (timeline:
      `gh api repos/{{repo}}/issues/<n>/timeline --paginate --jq '.[] | select(.event=="review_requested" or .event=="review_request_removed") | {event, actor: .actor.login, reviewer: .requested_reviewer.login, created_at}'`),
      unless the head commit changed since. The notification and the summary comment still wait for step 7.
   j. Milestone (only when none is set): the linked issue's milestone; otherwise, for a bug or documentation pull
      request, the milestone for bug fixes named in PROFILE.md, Milestones (if it names none, or it does not exist,
      leave it empty); otherwise leave it empty.
   k. Drafts: only steps a, b, c, e and f.
5. Apply only the differences, with REST calls through bot-gh (JSON files in `{{harness_dir}}/tmp/`):
   - add labels: `bot-gh api -X POST repos/{{repo}}/issues/<n>/labels --input labels.json` with {"labels": [...]}
   - remove a label: `bot-gh api -X DELETE "repos/{{repo}}/issues/<n>/labels/<url-encoded name>"`
   - assignee: `bot-gh api -X POST repos/{{repo}}/issues/<n>/assignees --input assignees.json` with {"assignees": [...]}
   - review request: `bot-gh api -X POST repos/{{repo}}/pulls/<n>/requested_reviewers --input reviewers.json` with
     {"reviewers": [...]}
   - milestone: `bot-gh api -X PATCH repos/{{repo}}/issues/<n> -F milestone=<number>`
6. Project board, on EVERY open pull request (also the ones step 2 skipped) and on recently closed ones. Optional: if
   PROFILE.md, Labels, says "Project board: None." or has no "Project board:" line, skip this step and say so in the
   summary. The board is a GitHub project (v2) of the repository owner; it has a single-select field Status with the
   options In progress, In review and Done (others, such as Backlog and Ready, may exist). On pull request cards this
   routine owns Status (MANAGED, like the status labels). Below, `<board>` is the board's number; if PROFILE.md gives
   only its title, find the number first:
   `gh api graphql -f query='{organization(login:"{{repo_owner}}"){projectsV2(first:50){nodes{number title}}}}'`.
   When the owner is a user, not an organisation, use `user(login:"{{repo_owner}}")` in place of
   `organization(login:"{{repo_owner}}")` in every query of this step.
   - Read the project's ids by name, never hardcode them:
     `gh api graphql -f query='{organization(login:"{{repo_owner}}"){projectV2(number:<board>){id field(name:"Status"){... on ProjectV2SingleSelectField{id options{id name}}}}}}'`.
     If the board, the Status field or one of the three options is missing, skip the rest of this step and report it.
   - Read the pull requests and their cards:
     `gh api graphql -f query='{repository(owner:"{{repo_owner}}",name:"{{repo_name}}"){open:pullRequests(states:OPEN,first:100){nodes{id number isDraft reviewDecision projectItems(first:10){nodes{id project{number} fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}}}}}} closed:pullRequests(states:[MERGED,CLOSED],last:30){nodes{id number projectItems(first:10){nodes{id project{number} fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}}}}}}}}'`
     (only the card of project `<board>` counts).
   - Wanted Status for an open pull request: draft → "In progress"; reviewDecision CHANGES_REQUESTED (a maintainer asked
     for changes) → "In progress"; otherwise (waiting for review, or approved and waiting for merge) → "In review". A
     merged or closed pull request that has a card → "Done" (never add a card for a closed pull request).
   - An open pull request with no card: add it, then set its Status:
     `bot-gh api graphql -f query='mutation($p:ID!,$c:ID!){addProjectV2ItemById(input:{projectId:$p,contentId:$c}){item{id}}}' -f p=<project id> -f c=<PR node id>`
     (the result's item id is the card).
   - Set Status only when it differs:
     `bot-gh api graphql -f query='mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){projectV2Item{id}}}' -f p=<project id> -f i=<card id> -f f=<Status field id> -f o=<option id>`
   - If a project call through bot-gh fails with "Resource not accessible by integration" (FORBIDDEN), the app lacks the
     organisation permission "Projects: read and write": stop step 6 for this run, change nothing else on the project,
     and say so in the summary. Never retry it with plain gh.
7. The maintainer's turn, on EVERY open non-draft pull request (also the ones step 2 skipped). The maintainer is asked
   only when Claude has nothing left to do on the pull request: the pr-review routine reviewed the current head with its
   reviewer model, the fixers answered, and the reviewer counter-reviewed every answer. State file:
   `{{harness_dir}}/state/ready-notified.tsv`, one line per notice: `<pr> <head sha> <date -Is>`. Skip a pull request
   that already has a line with its current headRefOid.
   - It is the maintainer's turn ("ready" below) when ALL of these hold at its current head:
     1. The latest Claude review ({{review_app}}[bot] or {{bot_app}}[bot]) whose body contains
        `<!-- pr-review-routine head=<headRefOid> -->` also contains a `<!-- pr-review-model ` marker (the pr-review
        routine adds it when its reviewer model made the review; a review without it does not count). Read its Verdict
        line (✅ / ⚠️ / ⛔).
     2. mergeable is MERGEABLE (no conflicts; UNKNOWN: not yet).
     3. Checks (this gh may have no `gh pr checks --json`):
        `gh pr view <n> -R {{repo}} --json statusCheckRollup --jq '.statusCheckRollup[] | "\(.name // .context) \(.status // "") \(.conclusion // .state)"'`.
        Every check run is COMPLETED with conclusion SUCCESS, SKIPPED or NEUTRAL, every status context is SUCCESS
        (anything queued, in progress, pending, failed, cancelled or timed out: not ready), the list is not empty, and
        no CI run is waiting for approval.
     4. Review threads:
        `gh api graphql -F n=<n> -f query='query($n:Int!){repository(owner:"{{repo_owner}}",name:"{{repo_name}}"){pullRequest(number:$n){reviewThreads(first:100){nodes{isResolved path comments(first:50){nodes{author{login} body url}}}}}}}'`.
        Every unresolved thread is one of: (a) the reviewer's thread (first comment by {{review_app}} or {{bot_app}})
        whose last comment is the reviewer's counter-reply (contains `<!-- pr-review-routine counter`: Still applies or
        Reviewer's view, left for the maintainer); (b) the reviewer's 🟡 nit nobody answered (one comment only); (c) a
        person's thread whose last comment is a review-fixer reply (contains `<!-- review-fixer-routine`: the person
        reads it). Anything else means Claude still has work: a reply the reviewer has not counter-reviewed yet, a
        person's request with no answer, or an unanswered 🔴 or 🟠 finding (the fixer, or the contributor on a community
        pull request, still has to act).
   - When ready, in this order:
     a. Review request: from {{co_maintainer}} when the author is {{maintainer}} (GitHub refuses a review of your own pull
        request), otherwise from {{maintainer}}; skip it if that person already has a pending request or an APPROVED
        latest review on the current head.
        `bot-gh api -X POST repos/{{repo}}/pulls/<n>/requested_reviewers --input reviewers.json` with {"reviewers": [...]}.
     b. One comment: write it to `{{harness_dir}}/tmp/ready-<n>.md` and post it with
        `bot-gh pr comment <n> -R {{repo}} --body-file <file>`. Simple words, short lines:
        A title from the reviewer's verdict: ✅ **Ready for your review** (or **Approved and ready to merge** when a
        maintainer, {{maintainer}} or {{co_maintainer}}, already approved the current head: Claude's own APPROVE review
        never counts as the maintainer's approval); ⚠️ **Needs your decision** (Claude's fixes and the reviewer disagree
        on what is left); ⛔ **Do not merge: please look** (security).
        - What the pull request does, in one line.
        - Reviews: how many review rounds the pr-review routine made (count its reviews), with a link to the latest
          review and its verdict.
        - Fixes applied: the commits pushed by the routines since the pull request opened (subjects ending in
          `(review)` or `(merge)`, and merges of `{{default_branch}}`), each as a short SHA link with its subject.
          "None" when there were none.
        - For you: every unresolved thread from condition 4 with its link and one line (the reviewer's "Still applies"
          or view, the decision asked, or the nit left), or "Nothing open".
        - Checks: each check with ✅ or skipped.
        Then the footer of RULES.md, Output, and, on its own line, `<!-- pr-metadata-ready head=<headRefOid> -->`.
     c. Append `<n> <headRefOid> <date -Is>` to ready-notified.tsv.
   - Notification (done by the run session, not the worker; see "How this run works"): after all pull requests, if at
     least one became ready in this run, load the tool with ToolSearch (`select:PushNotification`) and send ONE
     notification (status "proactive", one line, under 200 characters, no markdown), for example
     `PR #96 ready for your approval: <short title>. 2 fixes checked by the reviewer, 1 thread needs your call. github.com/{{repo}}/pull/96`,
     `PR #99 needs your decision: the reviewer and the fix disagree on 1 point. github.com/{{repo}}/pull/99`, or
     `3 PRs need you: #93 #96 #99. Summaries are on each PR.` Say who must approve when it is {{co_maintainer}}. If the
     tool is missing or says "not sent", the review request and comment still reach the maintainer: say so in the
     summary.
     Telegram (same run session, right after the PushNotification, with the same text): write it to
     `{{harness_dir}}/tmp/pr-metadata-ready.txt` with the Write tool, then Bash:
     `"$R/bin/notify" --title "✅ {{project}}: PR ready for you" < "$R/tmp/pr-metadata-ready.txt"`. Exit 3 means
     Telegram is not set up: fine, say so. Any other failure: report it; never retry another way.
   - A pull request that is not ready gets nothing here. If it was ready for an older head, new commits make it go
     through the whole cycle again (review of the new head, fixes, then a new notice).
8. Re-read each changed pull request and save its fingerprint (taken AFTER your changes, since they change updatedAt) to
   the state file. Remove entries of pull requests that are no longer open.
9. Final summary: a table of every open pull request (number, author, what you added, what you removed, assignee, review
   request, milestone, project Status before → after, ready or what is still missing), the pull requests you skipped as
   unchanged, closed pull requests moved to Done, the pull requests that became ready in this run and whether the
   notification was sent, and anything that needs a maintainer (CI to approve, conflicts, a `review: do not merge`, a
   missing project board or permission, a bot-gh failure with the change it could not make).

<!-- harness-routine pr-metadata v1.0.0 -->
