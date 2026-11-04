#!/usr/bin/env bash
# Tests bin/sentinel-scan on fake GitHub data and fake routine runs. Nothing is read from GitHub.
set -u
R=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/gh" "$T/runs" "$T/state/locks"
export HARNESS_CONFIG="$R/tests/fixtures/harness.json"
export HARNESS_SENTINEL_CONF="$R/tests/fixtures/sentinel.json"
export HARNESS_TEST=1 HARNESS_SENTINEL_FAKE="$T/gh" HARNESS_SENTINEL_STATE="$T/state" \
       HARNESS_SENTINEL_NOW=2026-11-03T12:00:00Z
python3 -I - "$T" <<'PY'
import json, os, sys, time
T = sys.argv[1]; g = f"{T}/gh"
def w(name, data): open(f"{g}/{name}.json", "w").write(json.dumps(data))
L = lambda *n: {"nodes": [{"name": x} for x in n]}
w("crit_issues", [
  {"number": 200, "title": "ssh step locks out Ubuntu 24.04", "url": "https://x/200", "labels": [{"name": "priority: critical"}, {"name": "agent-ready"}], "body": "", "author": {"login": "demo-maintainer"}},
  {"number": 202, "title": "outsider report", "url": "https://x/202", "labels": [{"name": "priority: critical"}, {"name": "agent-ready"}], "body": "", "author": {"login": "someone-else"}},
  {"number": 201, "title": "firewall leaves 22 open", "url": "https://x/201", "labels": [{"name": "priority: critical"}], "body": ""}])
pr = lambda n, head, branch, labels=(), closes=(), draft=False, merged=None: {
  "number": n, "title": f"PR {n}", "url": f"https://x/pull/{n}", "headRefName": branch, "headRefOid": head, "isDraft": draft,
  "mergedAt": merged, "labels": L(*labels), "closingIssuesReferences": {"nodes": [{"number": c, "labels": L("priority: critical")} for c in closes]}}
w("prs_open", {"data": {"repository": {"pullRequests": {"nodes": [
  pr(300, "a"*40, "claude/hotfix-201-firewall-20261103-0900"),
  pr(301, "b"*40, "feat/x", labels=("review: do not merge",)),
  pr(303, "c"*40, "fix/y", labels=("priority: critical",)),
  pr(305, "d"*40, "feat/z")]}}}})
w("prs_merged", {"data": {"repository": {"pullRequests": {"nodes": [
  pr(304, "e"*40, "claude/hotfix-150-x", merged="2026-11-03T08:00:00Z"),
  pr(299, "f"*40, "claude/hotfix-149-x", merged="2026-10-01T08:00:00Z"),
  pr(298, "9"*40, "feat/old", merged="2026-11-03T09:00:00Z")]}}}})
w("release", {"tag_name": "v1.1.1", "published_at": "2026-10-19T22:58:34Z"})
w("advisories_draft", [{"ghsa_id": "GHSA-aaaa-bbbb-cccc", "severity": "medium", "state": "draft", "html_url": "https://x/adv/1",
                        "summary": "SECRET-EXPLOIT-DETAILS token in world-readable log"}])
open(f"{g}/reviews_300.json", "w").write(json.dumps({"user": "demo-review[bot]",
  "body": "Verdict: ✅ Looks good to merge\n<!-- pr-review-routine head=" + "a"*40 + " -->"}) + "\n")
w("runs_lint.yml", [
  {"databaseId": 11, "status": "completed", "conclusion": "failure", "event": "push", "url": "https://x/run/11", "createdAt": "2026-11-03T10:00:00Z"},
  {"databaseId": 10, "status": "completed", "conclusion": "failure", "event": "push", "url": "https://x/run/10", "createdAt": "2026-11-03T09:00:00Z"},
  {"databaseId": 9, "status": "completed", "conclusion": "success", "event": "push", "url": "https://x/run/9", "createdAt": "2026-11-02T09:00:00Z"}])
w("runs_e2e.yml", [
  {"databaseId": 21, "status": "completed", "conclusion": "failure", "event": "schedule", "url": "https://x/run/21", "createdAt": "2026-11-03T04:00:00Z"},
  {"databaseId": 20, "status": "completed", "conclusion": "success", "event": "push", "url": "https://x/run/20", "createdAt": "2026-11-02T04:00:00Z"}])
tasks = [
  {"taskId": "demo-issue-developer", "title": "demo: issue developer", "enabled": True,
   "nextRunAt": "2026-11-03T13:00:00Z", "lastRunAt": "2026-11-03T11:00:00Z"},
  {"taskId": "demo-pr-review", "title": "demo: PR review", "enabled": True,
   "nextRunAt": "2026-11-03T13:00:00Z", "lastRunAt": "2026-11-03T08:00:00Z"},
  {"taskId": "demo-bug-hunter", "title": "demo: bug hunter", "enabled": True,
   "nextRunAt": "2026-11-03T08:00:00Z", "lastRunAt": "2026-11-02T08:00:00Z"},
  {"taskId": "other-task", "enabled": True, "nextRunAt": "2026-11-01T08:00:00Z"}]
open(f"{T}/tasks.json", "w").write(json.dumps(tasks))
json.dump({"runs": [{"session_id": "local_fail1", "status": "failed", "started_at": "2026-11-03T11:00:00Z", "error": "You've hit your session limit"},
                    {"session_id": "local_old", "status": "failed", "started_at": "2026-10-20T11:00:00Z", "error": "old"}]},
          open(f"{T}/runs/runs-demo-issue-developer.json", "w"))
json.dump({"runs": [{"session_id": "local_ok", "status": "succeeded", "started_at": "2026-11-03T09:00:00Z",
                     "summary": "Reviewed 2 PRs; resolveReviewThread failed with FORBIDDEN on 3 threads"},
                    {"session_id": "local_fine", "status": "succeeded", "started_at": "2026-11-03T09:30:00Z", "summary": "All good"}]},
          open(f"{T}/runs/runs-demo-bug-hunter.json", "w"))
json.dump({"runs": [{"session_id": "local_hung", "status": "running", "started_at": "2026-11-03T07:00:00Z"}]},
          open(f"{T}/runs/runs-demo-pr-review.json", "w"))
os.makedirs(f"{T}/state/locks/pr-77.lock"); old = time.time() - 20 * 3600; os.utime(f"{T}/state/locks/pr-77.lock", (old, old))
open(f"{T}/state/locks/issue-200.failed", "w").write("2026-10-31T10:00:00+01:00 needs_work four-lens review left a blocker\n")
PY

fail=0
ok()  { printf 'ok: %s\n' "$1"; }
bad() { printf 'not ok: %s\n' "$1"; fail=1; }
t() { if jq -e "$2" "$T/plan.json" >/dev/null; then ok "$1"; else bad "$1"; fi; }

"$R/bin/sentinel-scan" --need-runs "$T/tasks.json" > "$T/need"
[[ $(sort "$T/need" | tr '\n' ' ') == "demo-bug-hunter demo-issue-developer demo-pr-review " ]] \
    && ok "first run fetches runs of every task of this project, not other tasks" || { bad "need-runs"; cat "$T/need"; }

"$R/bin/sentinel-scan" --tasks "$T/tasks.json" --runs "$T/runs" > "$T/plan.json" || { bad "scan exits 0"; exit 1; }
t "critical issue with agent-ready is announced as starting" '[.messages[] | select(.title | test("Critical issue")) | .text | test("#200 .*\\n.*\\nagent-ready is on")] | any'
t "critical issue without agent-ready asks for it" '[.messages[].text | test("#201 .*\\n.*\\nAdd agent-ready")] | any'
t "a developer stop on a critical issue is reported" '[.messages[].text | test("#200: the developer stopped \\(needs_work")] | any'
t "the developer is started for #200 only (#201 has no label and a PR)" '.run_tasks | map(select(.taskId == "demo-issue-developer")) | length == 1 and (.[0].reason | test("#200")) and (.[0].reason | test("#201") | not)'
t "the advisory is announced without its summary" '[.messages[] | select(.title | test("Security")) | .text] | (.[0] | test("GHSA-aaaa-bbbb-cccc")) and (.[0] | test("SECRET") | not)'
t "a critical fix that passed review asks for the merge" '[.messages[].text | test("Critical fix #300 .*passed Claude.s review")] | any'
t "a do-not-merge label is reported" '[.messages[].text | test("#301 .*do not merge")] | any'
t "the review is not started while its routine is still running" '.run_tasks | map(select(.taskId == "demo-pr-review")) | length == 0'
t "lint red twice on main: critical, with an issue to open" '([.messages[].text | test("lint.yml failed on main \\(2 in a row\\)")] | any) and (.issues | length == 1) and (.issues[0].labels | index("priority: critical"))'
t "e2e red once on main: reported, no issue yet" '([.messages[].text | test("e2e.yml failed on main \\(1 in a row\\)")] | any) and ([.issues[].title | test("e2e")] | any | not)'
t "a critical fix merged after the release asks for a release" '([.messages[].text | test("Fix #304 .*not released")] | any) and ([.messages[].text | test("#299|#298")] | any | not)'
t "a routine failure in the last 24 h is reported, an old one is not" '([.messages[].text | test("issue developer failed at 11:00 UTC: You.ve hit your session limit")] | any) and ([.messages[].text | test("UTC: old")] | any | not)'
t "a successful run whose summary reports FORBIDDEN is flagged, a clean one is not" '([.messages[].text | test("bug hunter finished but reports a problem \\(FORBIDDEN\\)")] | any) and ([.messages[].text | test("All good")] | any | not)'
t "a run going for 5 h is reported as hung" '[.messages[].text | test("PR review has been running for 5.0 h")] | any'
t "a task 4 h past its slot is reported, other apps tasks are not" '([.messages[].text | test("bug hunter has not started since")] | any) and ([.messages[].text | test("other-task")] | any | not)'
t "a 20 h old lock is reported" '[.messages[].text | test("pr-77.lock is 20 h old")] | any'
t "one desktop notification line under 200 characters" '(.push | length) < 200 and (.push | test("needs you"))'
t "messages are grouped, security first" '(.messages | length) == 6 and (.messages[0].title | test("Security"))'
grep -q 'sentinel main-red workflow=lint.yml' "$(jq -r '.issues[0].body_file' "$T/plan.json")" && ok "the issue body carries its marker" || bad "issue marker"

# Gates for the hotfix routines: same rules, no state written.
before=$(md5sum < "$T/state/sentinel.json")
out=$("$R/bin/sentinel-scan" --gate develop); rc=$?
[[ $rc == 0 && $out == "#200" ]] && ok "develop gate opens for #200 only (not the outsider's #202)" || bad "develop gate ($rc: $out)"
out=$("$R/bin/sentinel-scan" --gate review); rc=$?
[[ $rc == 0 && $out == "#303" ]] && ok "review gate opens for the unreviewed critical PR #303 only" || bad "review gate ($rc: $out)"
[[ $(md5sum < "$T/state/sentinel.json") == "$before" ]] && ok "gates write no state" || bad "gates wrote state"
mkdir "$T/state/locks/issue-200.lock"
"$R/bin/sentinel-scan" --gate develop >/dev/null; [[ $? == 1 ]] && ok "develop gate stays shut while #200 is locked by a run" || bad "gate ignores the lock"
rmdir "$T/state/locks/issue-200.lock"

# A run in progress blocks the PR review trigger above; once it ends the trigger comes.
python3 -I -c 'import json,sys; p=sys.argv[1]; json.dump({"runs":[{"session_id":"local_hung","status":"succeeded","started_at":"2026-11-03T07:00:00Z"}]}, open(p,"w"))' \
    "$T/runs/runs-demo-pr-review.json"
"$R/bin/sentinel-scan" --tasks "$T/tasks.json" --runs "$T/runs" > "$T/plan.json"
t "the review starts once its routine is idle" '.run_tasks | map(select(.taskId == "demo-pr-review" and (.reason | test("#303")))) | length == 1'

# Ack everything and record the triggers: the next scan is quiet.
mapfile -t keys < <(jq -r '.messages[].keys[], .issues[].key' "$T/plan.json")
"$R/bin/sentinel-scan" --ack "${keys[@]}" >/dev/null
mapfile -t trig < <(jq -r '.run_tasks[].taskId' "$T/plan.json")
"$R/bin/sentinel-scan" --triggered "${trig[@]}" >/dev/null
"$R/bin/sentinel-scan" --tasks "$T/tasks.json" --runs "$T/runs" > "$T/plan.json"
t "after the ack nothing is sent twice and no issue is opened twice" '(.messages | length) == 0 and (.issues | length) == 0 and .push == null'
t "a started routine is not started again within the cooldown" '.run_tasks | length == 0'

# A day later the merged critical fix is still not released: one reminder.
HARNESS_SENTINEL_NOW=2026-11-04T12:00:00Z "$R/bin/sentinel-scan" --tasks "$T/tasks.json" --runs "$T/runs" > "$T/plan.json"
t "a merged critical fix still unreleased after 24 h gets one reminder" '[.messages[].text | test("Still waiting. Fix #304")] | any'

exit "$fail"
