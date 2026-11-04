#!/usr/bin/env bash
# Tests bin/security-watch on fake feeds. Nothing is read from the network.
set -u
R=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/feeds" "$T/state"
export HARNESS_CONFIG="$R/tests/fixtures/harness.json"
export HARNESS_SECWATCH_CONF="$R/profiles/server-prep/security-watch.json"
export HARNESS_TEST=1 HARNESS_SECWATCH_FAKE="$T/feeds" HARNESS_SECWATCH_STATE="$T/state" \
       HARNESS_SECWATCH_NOW=2026-11-03T12:00:00Z
python3 -I - "$T/feeds" "$R/profiles/server-prep/security-watch.json" <<'PY'
import json, re, sys
F, conf = sys.argv[1], json.load(open(sys.argv[2]))
def w(n, d): json.dump(d, open(f"{F}/{n}.json", "w"))
for s in conf["github_advisories"]:
    w("ghsa_" + re.sub(r"[^a-z0-9]+", "_", s["repo"].lower()), [])
for q in conf["nvd"]:
    w("nvd_" + re.sub(r"[^a-z0-9]+", "_", q["component"].lower()), {"vulnerabilities": []})
adv = lambda g, c, sev, pub, s: {"ghsa_id": g, "cve_id": c, "severity": sev, "published_at": pub, "html_url": f"https://x/{g}",
    "summary": s, "vulnerabilities": [{"patched_versions": "4.0.1"}], "cvss": {"score": 9.8}}
w("ghsa_coollabsio_coolify", [
    adv("GHSA-new1", "CVE-2026-1001", "critical", "2026-11-01T10:00:00Z", "Remote code execution through the API"),
    adv("GHSA-med1", None, "medium", "2026-11-01T10:00:00Z", "Medium issue"),
    adv("GHSA-old1", "CVE-2025-0001", "critical", "2025-01-01T10:00:00Z", "Old one")])
w("nvd_openssh", {"vulnerabilities": [
    {"cve": {"id": "CVE-2026-2002", "published": "2026-10-30T10:00:00", "descriptions": [{"lang": "en", "value": "OpenSSH sshd pre-auth bug"}],
             "metrics": {"cvssMetricV31": [{"cvssData": {"baseSeverity": "HIGH", "baseScore": 8.1}}]}}},
    {"cve": {"id": "CVE-2026-2003", "published": "2026-10-30T10:00:00", "descriptions": [{"lang": "en", "value": "low one"}],
             "metrics": {"cvssMetricV31": [{"cvssData": {"baseSeverity": "LOW", "baseScore": 2.0}}]}}},
    {"cve": {"id": "CVE-2026-1001", "published": "2026-11-01T10:00:00", "descriptions": [{"lang": "en", "value": "same as the Coolify GHSA"}],
             "metrics": {"cvssMetricV31": [{"cvssData": {"baseSeverity": "CRITICAL", "baseScore": 9.8}}]}}}]})
w("kev", {"vulnerabilities": [
    {"cveID": "CVE-2026-3003", "vendorProject": "Linux", "product": "Kernel", "dateAdded": "2026-10-28",
     "vulnerabilityName": "Linux Kernel use-after-free", "requiredAction": "Apply updates"},
    {"cveID": "CVE-2026-9999", "vendorProject": "Ivanti", "product": "Connect Secure", "dateAdded": "2026-10-28",
     "vulnerabilityName": "Not ours", "requiredAction": "x"},
    {"cveID": "CVE-2026-2002", "vendorProject": "OpenBSD", "product": "OpenSSH", "dateAdded": "2025-01-01",
     "vulnerabilityName": "old KEV entry flags the NVD item", "requiredAction": "x"}]})
w("pin_ufw_docker", {"current": "251123", "latest": "260101"})
# OSV: query order is package x ecosystem, as in security-watch.json
pk, ecos = list(conf["osv_packages"]), conf["osv_ecosystems"]
idx = lambda pkg, eco: pk.index(pkg) * len(ecos) + ecos.index(eco)
res = [{} for _ in range(len(pk) * len(ecos))]
res[idx("openssh", "Debian:12")] = {"vulns": [{"id": "DEBIAN-CVE-2026-5001", "modified": "2026-11-02T10:00:00Z"},
                                              {"id": "DEBIAN-CVE-2019-0001", "modified": "2026-11-02T10:00:00Z"}],
                                    "next_page_token": "p2"}
res[idx("openssh", "Ubuntu:24.04:LTS")] = {"vulns": [{"id": "UBUNTU-CVE-2026-5001", "modified": "2026-11-01T10:00:00Z"}]}
res[idx("glibc", "Debian:13")] = {"vulns": [{"id": "DEBIAN-CVE-2026-6001", "modified": "2026-11-01T10:00:00Z"},
                                            {"id": "DEBIAN-CVE-2025-7001", "modified": "2026-11-01T10:00:00Z"}]}
w("osv_batch_0", {"results": res})
w("osv_batch_1", {"results": [{"vulns": [{"id": "DEBIAN-CVE-2026-5002", "modified": "2026-11-02T10:00:00Z"}]}]})
rec = lambda vid, pub, sev, fixed, eco: {"id": vid, "published": pub, "upstream": [vid.split("-", 1)[1]], "summary": f"summary {vid}",
    "severity": sev, "affected": [{"package": {"ecosystem": eco}, "ranges": [{"events": [{"introduced": "0"}, {"fixed": fixed}]}]}]}
w("osv_vuln_DEBIAN_CVE_2026_5001", rec("DEBIAN-CVE-2026-5001", "2026-11-01T00:00:00Z",
    [{"type": "CVSS_V3", "score": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"}], "1:9.2p1-2+deb12u9", "Debian:12"))
w("osv_vuln_UBUNTU_CVE_2026_5001", rec("UBUNTU-CVE-2026-5001", "2026-11-01T00:00:00Z",
    [{"type": "Ubuntu", "score": "high"}], "1:9.6p1-3ubuntu13.21", "Ubuntu:24.04:LTS"))
w("osv_vuln_DEBIAN_CVE_2026_5002", rec("DEBIAN-CVE-2026-5002", "2026-11-02T00:00:00Z",
    [{"type": "CVSS_V3", "score": "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:L/A:L"}], "1:9.2p1-2+deb12u9", "Debian:12"))
w("osv_vuln_DEBIAN_CVE_2026_6001", rec("DEBIAN-CVE-2026-6001", "2026-11-01T00:00:00Z",
    [{"type": "CVSS_V3", "score": "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:L/A:L"}], "6.12.1-1", "Debian:13"))
PY

printf '#!/usr/bin/env bash\nshift 2; { printf "ALERT\\n"; cat; } >> "%s/alerts"\n' "$T" > "$T/fake-notify"; chmod +x "$T/fake-notify"
export HARNESS_SECWATCH_NOTIFY="$T/fake-notify"
fail=0
ok()  { printf 'ok: %s\n' "$1"; }
bad() { printf 'not ok: %s\n' "$1"; fail=1; }
t() { if jq -e "$2" "$T/plan.json" >/dev/null; then ok "$1"; else bad "$1"; jq -c '[.candidates[] | {key, severity, kev, sources}]' "$T/plan.json"; fi; }

"$R/bin/security-watch" --scan --notify > "$T/plan.json" || { bad "scan exits 0"; exit 1; }
t "all five sources read" '.sources_ok == ["github","osv","nvd","kev","pins"] and .errors == []'
t "OSV: Debian and Ubuntu records of one CVE merge, with every fixed version" '[.candidates[] | select(.key == "CVE-2026-5001" and .severity == "critical" and (.sources == ["osv:debian","osv:ubuntu"]) and (.patched | test("Debian 12 1:9.2p1-2\\+deb12u9")) and (.patched | test("Ubuntu 24.04 1:9.6p1-3ubuntu13.21")))] | length == 1'
t "OSV: the next page of a package is read" '[.candidates[].key] | index("CVE-2026-5002") != null'
t "OSV: a CVE from an old year is skipped even when re-modified" '[.candidates[].aliases[]] | index("DEBIAN-CVE-2019-0001") == null'
t "OSV: a medium glibc CVE stays under the glibc floor (high)" '[.candidates[].key] | index("CVE-2026-6001") == null'
jq -e '(.osv_known | index("DEBIAN-CVE-2025-7001")) and (.osv_known | index("DEBIAN-CVE-2026-5001")) and (.osv_known | index("DEBIAN-CVE-2019-0001"))' "$T/state/security-watch.json" >/dev/null \
    && ok "OSV: the first run learns last year's and old ids without reading them" || bad "osv_known after the first run"
t "the pre-triage alert ran" '.prealert == "sent"'
if grep -q "EXPLOITED (CISA KEV) · Linux kernel · CVE-2026-3003" "$T/alerts" && grep -q "CRITICAL · OpenSSH · CVE-2026-5001" "$T/alerts" \
    && ! grep -q "CVE-2026-5002" "$T/alerts"; then ok "the alert lists exploited and critical items only"; else bad "alert content"; cat "$T/alerts"; fi
"$R/bin/security-watch" --scan --notify > "$T/plan2.json"
if [[ $(grep -c ALERT "$T/alerts") == 1 ]] && jq -e '.prealert == "nothing urgent"' "$T/plan2.json" >/dev/null; then
    ok "no second alert for the same items"; else bad "alert repeated"; fi
t "a new critical panel advisory is kept, with its patched version" '[.candidates[] | select(.key == "CVE-2026-1001" and .severity == "critical" and .patched == "4.0.1" and .kind == "panel")] | length == 1'
t "the same CVE from GitHub and NVD is one candidate with both sources" '[.candidates[] | select(.key == "CVE-2026-1001") | .sources] == [["github:coollabsio/coolify","nvd"]]'
t "medium is kept (min_severity medium), low and old items are dropped" '[.candidates[].key] | (index("GHSA-med1") != null) and (index("CVE-2026-2003") == null) and (index("CVE-2025-0001") == null)'
t "a KEV entry for the Linux kernel is critical and flagged" '[.candidates[] | select(.key == "CVE-2026-3003" and .kev and .severity == "critical" and .component == "Linux kernel")] | length == 1'
t "KEV entries for other vendors are ignored" '[.candidates[].key] | index("CVE-2026-9999") == null'
t "an older KEV listing flags a new NVD item as exploited" '[.candidates[] | select(.key == "CVE-2026-2002" and .kev)] | length == 1'
t "exploited items come first" '.candidates[0].kev and .candidates[1].kev'
t "a pinned download behind its release is a candidate" '[.candidates[] | select(.key == "pin:ufw-docker:260101" and .kind == "pinned")] | length == 1'
t "component notes travel with each candidate" '[.candidates[] | select(.component == "CrowdSec" or .component == "Coolify") | .notes | length > 10] | all'

mapfile -t keys < <(jq -r '.candidates[].key' "$T/plan.json")
"$R/bin/security-watch" --ack "${keys[@]}" >/dev/null
"$R/bin/security-watch" --scan > "$T/plan.json"
t "after the ack nothing is listed again" '.candidates == []'
# A record that is new on a later run is read even when its CVE is from last year.
python3 -I - "$T/feeds" "$R/profiles/server-prep/security-watch.json" <<'PYX'
import json, sys
F, conf = sys.argv[1], json.load(open(sys.argv[2]))
pk, ecos = list(conf["osv_packages"]), conf["osv_ecosystems"]
res = [{} for _ in range(len(pk) * len(ecos))]
res[pk.index("sudo") * len(ecos)] = {"vulns": [{"id": "DEBIAN-CVE-2025-8001", "modified": "2026-11-03T08:00:00Z"},
                                               {"id": "DEBIAN-CVE-2026-5001", "modified": "2026-11-03T08:00:00Z"}]}
json.dump({"results": res}, open(f"{F}/osv_batch_0.json", "w"))
json.dump({"id": "DEBIAN-CVE-2025-8001", "published": "2026-11-02T00:00:00Z", "upstream": ["CVE-2025-8001"], "summary": "sudo bug",
           "severity": [{"type": "CVSS_V3", "score": "CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H"}],
           "affected": [{"package": {"ecosystem": "Debian:12"}, "ranges": [{"events": [{"fixed": "1.9.13p3-1+deb12u2"}]}]}]},
          open(f"{F}/osv_vuln_DEBIAN_CVE_2025_8001.json", "w"))
PYX
"$R/bin/security-watch" --scan > "$T/plan.json"
t "OSV: a record new since the last run is read; a known one is not read again" '([.candidates[] | select(.key == "CVE-2025-8001" and .component == "sudo" and .severity == "high")] | length == 1) and ([.candidates[].key] | index("CVE-2026-5001") == null)'
"$R/bin/security-watch" --ack CVE-2025-8001 >/dev/null
"$R/bin/security-watch" --ack GHSA-gone >/dev/null
jq -e '.since.github and .since.nvd and .since.kev' "$T/state/security-watch.json" >/dev/null && ok "each source remembers its last good read" || bad "since per source"

rm "$T/feeds/kev.json"
"$R/bin/security-watch" --scan > "$T/plan.json"; rc=$?
[[ $rc == 0 ]] && t "a failing source is reported, the others still run" '(.errors | length) == 1 and (.errors[0] | test("cisa-kev")) and (.sources_ok | index("kev") == null)' || bad "partial failure exits 0"
rm "$T"/feeds/*.json
"$R/bin/security-watch" --scan >/dev/null 2>&1; [[ $? == 1 ]] && ok "no source at all exits 1" || bad "no source exits 1"

"$R/bin/security-watch" --narrative-due && ok "the web pass is due the first time" || bad "narrative due"
"$R/bin/security-watch" --narrative-done
"$R/bin/security-watch" --narrative-due; [[ $? == 1 ]] && ok "not due again for 20 hours" || bad "narrative not due"
exit "$fail"
