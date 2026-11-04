#!/usr/bin/env bash
# Tests bin/status-board-collect on fake GitHub data, fake artifacts and fake routine runs. Nothing is read from GitHub:
# a gh on PATH that fails the test if it is ever called stands guard.
set -u
R=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/gh" "$T/home/state/status-board/raw" "$T/home/locks" "$T/bin"
printf '#!/bin/sh\necho "real gh called: $*" >> "%s/gh-called"\nexit 99\n' "$T" > "$T/bin/gh"
chmod +x "$T/bin/gh"
printf 'DEMO-CANARY-0000\nsecret-host-[0-9]+\n' > "$T/patterns.txt"
export PATH="$T/bin:$PATH"
export HARNESS_CONFIG="$R/tests/fixtures/harness.json"
export HARNESS_TEST=1 HARNESS_STATUS_BOARD_FAKE="$T/gh" HARNESS_STATUS_BOARD_HOME="$T/home" \
       HARNESS_STATUS_BOARD_NOW=2026-11-03T12:00:00Z HARNESS_PRIVATE_PATTERNS="$T/patterns.txt"

python3 -I - "$T" <<'PY'
import json, os, sys
T = sys.argv[1]; g = f"{T}/gh"
def w(name, data): open(f"{g}/{name}.json", "w").write(json.dumps(data))
L = lambda *n: [{"name": x} for x in n]
w("repo", {"stargazers_count": 3, "forks_count": 1, "subscribers_count": 2, "pushed_at": "2026-11-03T10:00:00Z"})
w("releases", [{"tagName": "v0.3.0", "publishedAt": "2026-10-20T10:00:00Z", "name": "v0.3.0"}])
open(f"{g}/changelog.txt", "w").write("# Changelog\n\n## [Unreleased]\n\n- one\n- two\n\n## [0.3.0]\n\n- old\n")
w("prs_open", [
  {"number": 40, "title": "Fix the parser", "author": {"login": "app/demo-claude"}, "labels": L("claude", "area: core"),
   "milestone": {"title": "0.4"}, "isDraft": False, "createdAt": "2026-10-30T10:00:00Z", "updatedAt": "2026-11-03T09:00:00Z",
   "reviewDecision": "", "mergeable": "MERGEABLE", "headRefName": "claude/fix-12-parser-20261030-1000",
   "statusCheckRollup": [{"name": "ci", "status": "COMPLETED", "conclusion": "SUCCESS"}],
   "url": "https://x/pull/40", "additions": 10, "deletions": 2},
  {"number": 41, "title": "Docs", "author": {"login": "demo-maintainer"}, "labels": L("review: do not merge"),
   "isDraft": False, "createdAt": "2026-11-02T10:00:00Z", "updatedAt": "2026-11-03T09:00:00Z", "reviewDecision": "",
   "mergeable": "MERGEABLE", "headRefName": "docs/readme", "statusCheckRollup": [{"name": "ci", "status": "COMPLETED", "conclusion": "SUCCESS"}],
   "url": "https://x/pull/41", "additions": 1, "deletions": 1}])
w("issues_open", [
  {"number": 12, "title": "Parser crash", "labels": L("bug", "priority: high", "agent-ready"), "author": {"login": "someone"},
   "createdAt": "2026-10-28T10:00:00Z", "updatedAt": "2026-11-02T10:00:00Z", "url": "https://x/issues/12", "milestone": {"title": "0.4"}},
  {"number": 13, "title": "Idea", "labels": L("proposal"), "author": {"login": "someone"},
   "createdAt": "2026-11-02T10:00:00Z", "updatedAt": "2026-11-02T11:00:00Z", "url": "https://x/issues/13", "milestone": None}])
w("milestones", [
  {"number": 4, "title": "0.4", "open_issues": 1, "closed_issues": 2, "due_on": None, "html_url": "https://x/milestone/4"},
  {"number": 3, "title": "0.3.1", "open_issues": 0, "closed_issues": 2, "due_on": None, "html_url": "https://x/milestone/3"}])
w("milestone_3_closed", [{"number": 9, "closed_at": "2026-10-25T10:00:00Z"}, {"number": 8, "closed_at": "2026-10-10T10:00:00Z"}])
run = lambda i, wf, concl, branch="main", at="2026-11-03T08:00:00Z", event="push": {
  "databaseId": i, "workflowName": wf, "status": "completed", "conclusion": concl, "event": event, "headBranch": branch,
  "headSha": f"{i:07d}abc", "createdAt": at, "startedAt": at, "updatedAt": "2026-11-03T08:20:00Z",
  "displayTitle": f"run {i}", "url": f"https://x/run/{i}"}
w("runs", [run(101, "ci", "success"), run(102, "e2e", "failure"), run(103, "pages", "failure"),
           run(104, "ci", "failure", "claude/fix-12-parser-20261030-1000", event="pull_request")])
w("commits", [{"sha": "a" * 40, "commit": {"message": "Fix\n\nbody", "committer": {"date": "2026-11-02T10:00:00Z"},
               "author": {"name": "Demo"}}, "author": {"login": "demo-maintainer"}, "html_url": "https://x/commit/a"}])
w("prs_merged", [{"number": 39, "title": "Merged one", "mergedAt": "2026-11-03T07:00:00Z", "author": {"login": "demo-maintainer"}, "url": "https://x/pull/39"}])
w("prs_created", [{"number": 41, "title": "Docs", "createdAt": "2026-11-02T10:00:00Z", "author": {"login": "demo-maintainer"}, "url": "https://x/pull/41"}])
w("issues_created", [{"number": 13, "title": "Idea", "createdAt": "2026-11-02T10:00:00Z", "author": {"login": "someone"}, "url": "https://x/issues/13"}])
w("issues_closed", [])
# tests workflow: run 201 passed on main, run 202 (newer) failed on main: one regression
w("tests_runs", [run(202, "e2e", "failure", at="2026-11-03T06:00:00Z"), run(201, "e2e", "success", at="2026-11-02T06:00:00Z")])
w("checks_runs", [run(101, "ci", "success")])
jobs = lambda *names: {"jobs": [{"name": n, "status": "completed", "conclusion": "success", "startedAt": "2026-11-03T06:00:00Z",
                                 "completedAt": "2026-11-03T06:10:00Z", "url": "https://x/job", "steps": [
                                 {"name": "Set up job", "conclusion": "success"}, {"name": "Syntax", "conclusion": "success"},
                                 {"name": "Unit tests", "conclusion": "success"}]} for n in names]}
w("run_201_jobs", jobs("setup", "alpha", "beta"))
w("run_202_jobs", jobs("setup", "alpha", "beta"))
w("run_101_jobs", jobs("ci"))
def results(osn, ok):
    return {"os": osn, "label": osn.title(), "status": "passed" if ok else "failed", "duration_s": 300,
            "counts": {"passed": 2 if ok else 1, "failed": 0 if ok else 1, "skipped": 0},
            "audit": {"before": {"pass": 10, "warn": 2, "fail": 1, "info": 0, "score": 70},
                      "after": {"pass": 13, "warn": 0, "fail": 0, "info": 0, "score": 100}},
            "steps": [{"label": "firewall", "second": "OK"}],
            "scenarios": [{"id": "install", "title": "Installs", "group": "core", "status": "passed", "duration_s": 100,
                           "assertions": [{"name": "exit 0", "ok": True}]},
                          {"id": "rerun", "title": "Second run changes nothing", "group": "core",
                           "status": "passed" if ok else "failed", "duration_s": 50,
                           "assertions": [{"name": "no CHANGED", "ok": ok, "detail": "" if ok else "firewall CHANGED"}]}]}
for rid, ok in ((201, True), (202, False)):
    for osn in ("alpha", "beta"):
        d = f"{g}/artifacts/{rid}/e2e-vm-{osn}"
        os.makedirs(d)
        json.dump(results(osn, ok or osn == "beta"), open(f"{d}/results.json", "w"))
# an artifact that links outside itself must never be read
os.makedirs(f"{g}/artifacts/202/e2e-vm-evil")
open(f"{T}/outside.json", "w").write(json.dumps(results("evil", True) | {"label": "OUTSIDE-FILE-READ"}))
os.symlink(f"{T}/outside.json", f"{g}/artifacts/202/e2e-vm-evil/results.json")

raw = f"{T}/home/state/status-board/raw"
json.dump([
  {"taskId": "demo-pr-review", "title": "demo: PR review", "enabled": True, "cronExpression": "7 11 * * *",
   "nextRunAt": "2026-11-03T13:00:00Z", "lastRunAt": "2026-11-03T11:00:00Z", "description": "Reviews PRs"},
  {"taskId": "demo-status-board", "title": "demo: Status board", "enabled": True, "cronExpression": "30 8,19 * * *",
   "nextRunAt": "2026-11-03T19:30:00Z", "lastRunAt": "2026-11-03T08:30:00Z"},
  {"taskId": "other-task", "title": "someone else's task", "enabled": True, "nextRunAt": "2026-11-01T08:00:00Z"}],
  open(f"{raw}/tasks.json", "w"))
json.dump({"runs": [{"status": "succeeded", "started_at": "2026-11-03T11:00:00Z", "last_activity_at": "2026-11-03T11:20:00Z",
                     "summary": "Reviewed #40 on secret-host-07 with DEMO-CANARY-0000"},
                    {"status": "succeeded", "started_at": "2026-11-02T11:00:00Z", "summary": "Reviewed #39, all good"}]},
          open(f"{raw}/runs-demo-pr-review.json", "w"))
json.dump({"runs": [{"status": "running", "started_at": "2026-11-03T11:59:00Z"},
                    {"status": "succeeded", "started_at": "2026-11-03T08:30:00Z", "summary": "ok, attention, 3 items"}]},
          open(f"{raw}/runs-other-task.json", "w"))
json.dump({"runs": [{"status": "running", "started_at": "2026-11-03T11:59:00Z"},
                    {"status": "succeeded", "started_at": "2026-11-03T08:30:00Z", "summary": "ok, 3 attention items"}]},
          open(f"{raw}/runs-demo-status-board.json", "w"))
open(f"{T}/home/locks/issue-12.failed", "w").write("2026-11-02T10:00:00+00:00 needs_work review found 2 problems\n")
json.dump({"timezone": "Europe/Paris", "ci": {"workflows": [{"name": "ci", "file": "ci.yml", "required": True}]}},
          open(f"{T}/conf-ci.json", "w"))
json.dump({"timezone": "Europe/Paris", "release_workflow": "release.yml",
           "ci": {"workflows": [{"name": "ci", "file": "ci.yml", "required": True}]},
           "tests": {"name": "e2e", "workflow": "e2e.yml", "artifact_prefix": "e2e-vm-", "results_file": "results.json",
                     "format": "scenarios-v1", "ignore_jobs": ["setup"], "description": "Two systems",
                     "report": {"url": "https://example.com/report/", "main": "main/", "pr": "pr-{pr}/"}}},
          open(f"{T}/conf-tests.json", "w"))
PY

fail=0
check() { if eval "$2"; then echo "ok   - $1"; else echo "FAIL - $1"; fail=1; fi; }
snap="$T/home/state/status-board/out/snapshot.json"
q() { python3 -I -c "import json,sys; s=json.load(open('$snap')); print($1)"; }

# 1. CI only: no tests data
out=$(HARNESS_STATUS_BOARD_CONF="$T/conf-ci.json" "$R/bin/status-board-collect" 2>&1); rc=$?
check "collector exits 0 without tests settings" "[[ $rc == 0 ]]"
[[ $rc == 0 ]] || echo "$out"
check "snapshot shape" "[[ \$(q \"','.join(sorted(s))\") == activity,attention,board,changes,ci,errors,generatedAt,issues,locks,nextRefresh,prs,repo,routines,schema,slot,status,trend ]]"
check "no tests or e2e block without a tests setting" "[[ \$(q \"'tests' in s or 'e2e' in s\") == False ]]"
check "only tasks with the task_prefix" "[[ \$(q \"','.join(sorted(r['id'] for r in s['routines']))\") == demo-pr-review,demo-status-board ]]"
check "routine title without the project prefix" "[[ \$(q \"[r['title'] for r in s['routines'] if r['id']=='demo-pr-review'][0]\") == 'PR review' ]]"
check "the running status-board run is left out" "[[ \$(q \"[r['recent'][0]['status'] for r in s['routines'] if r['id']=='demo-status-board'][0]\") == succeeded ]]"
check "private canary filtered from summaries" "! grep -q -e DEMO-CANARY-0000 -e secret-host-07 '$snap' && grep -q 'hidden: mentions private' '$snap'"
check "board identity from harness.json" "[[ \$(q \"s['board']['project']+' '+s['board']['bot']+' '+s['board']['timezone']\") == 'demo demo-claude[bot] Europe/Paris' ]]"
check "unreleased changes from the changelog" "[[ \$(q \"s['repo']['unreleasedChanges']\") == 2 ]]"
check "required workflow green, other red on main is a warning" "[[ \$(q \"[a['level'] for a in s['attention'] if a['text']=='pages is failing on main'][0]\") == warn ]]"
check "do-not-merge review is critical" "[[ \$(q \"s['status']\") == critical ]]"
check "milestone finished after the release is flagged" "q \"[a['text'] for a in s['attention'] if a['area']=='Release']\" | grep -q '0.3.1.*release it'"
check "milestone developed: every issue has a PR" "[[ \$(q \"[m['state'] for m in s['issues']['milestones'] if m['title']=='0.4'][0]\") == developed ]]"
check "failed lock reported" "q \"[a['text'] for a in s['attention']]\" | grep -q 'stopped on #12'"
check "no real gh call" "[[ ! -e '$T/gh-called' ]]"

# 2. with a tests setting: the tests block, a regression on the default branch, the symlinked artifact ignored
out=$(HARNESS_STATUS_BOARD_CONF="$T/conf-tests.json" "$R/bin/status-board-collect" 2>&1); rc=$?
check "collector exits 0 with tests settings" "[[ $rc == 0 ]]"
[[ $rc == 0 ]] || echo "$out"
check "tests and e2e blocks present" "[[ \$(q \"'tests' in s and 'e2e' in s\") == True ]]"
check "systems from the artifact names" "[[ \$(q \"','.join(s['tests']['osOrder'])\") == alpha,beta ]]"
check "regression found on the default branch" "[[ \$(q \"[r['scenario']+' on '+r['os'] for r in s['tests']['health']['regressions']]\") == \"['rerun on alpha']\" ]]"
check "regression on the default branch is critical" "q \"[a['text'] for a in s['attention'] if a['level']=='critical' and a['area']=='Tests']\" | grep -q 'regression'"
check "audit stages kept as given" "[[ \$(q \"list(s['tests']['latest']['oses'][0]['audit'])\") == \"['before', 'after']\" ]]"
check "symlinked results never read" "! grep -q OUTSIDE-FILE-READ '$snap' && [[ \$(q \"'evil' in s['tests']['osOrder']\") == False ]]"
check "ignored jobs left out of the run summary" "[[ \$(q \"[j['name'] for j in s['e2e']['main']['jobs']]\") == \"['alpha', 'beta']\" ]]"
check "report link for the default branch" "[[ \$(q \"s['tests']['latest']['reportUrl']\") == https://example.com/report/main/ ]]"
check "checks history from the required workflow" "[[ \$(q \"[c['name'] for c in s['tests']['checks']]\") == \"['Syntax', 'Unit tests']\" && \$(q \"s['tests']['checksName']\") == ci ]]"
check "previous snapshot kept for the diffs" "[[ -f '$T/home/state/status-board/out/previous.json' ]]"
check "no real gh call" "[[ ! -e '$T/gh-called' ]]"

# 3. a bad settings file stops the run and writes nothing new
echo '{"timezone": "Mars/Olympus"}' > "$T/conf-bad.json"
before=$(md5sum < "$snap")
HARNESS_STATUS_BOARD_CONF="$T/conf-bad.json" "$R/bin/status-board-collect" >/dev/null 2>&1; rc=$?
check "unknown timezone: exit 1, snapshot unchanged" "[[ $rc == 1 && \$(md5sum < '$snap') == '$before' ]]"

# 4. test overrides are ignored outside test mode: the fixture's harness_dir does not exist, so nothing is written there
HARNESS_TEST=0 HARNESS_STATUS_BOARD_CONF="$T/conf-ci.json" timeout 60 "$R/bin/status-board-collect" >/dev/null 2>&1
check "outside test mode the fake data is not used" "[[ -e '$T/gh-called' ]]"

exit $fail
