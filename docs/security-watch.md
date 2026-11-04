# Security watch

`bin/security-watch` collects new security problems in what your project depends on or deploys, and the
`security-watch` routine decides what each one means for your project.

## Sources (no API key needed)

| Source | For | How it stays quiet |
|---|---|---|
| GitHub repository security advisories | upstream projects on GitHub (`github_advisories`) | published since the last read |
| OSV.dev | distro packages (`osv_packages` per `osv_ecosystems`, e.g. `Debian:12`, `Ubuntu:24.04:LTS`) | only advisory ids never seen before (`osv_known`), per-package severity floor |
| NVD CVE API 2.0 | products without GitHub advisories (`nvd`: CPE or keyword, optional severity filter) | published since the last read, 6.5 s between requests |
| CISA Known Exploited Vulnerabilities | products in `kev` | added since the last read; also flags any candidate already exploited |
| Pinned releases | `pins`: a variable in a file of your repository against the upstream's latest release | once per new release |

Candidates are deduplicated by CVE, kept from `min_severity` up (and always when exploited), and sorted exploited first.
With `--notify`, an alert goes to Telegram before any triage for new exploited or critical items, once each.

## `security-watch.json`

```json
{
  "min_severity": "medium",
  "components": {"OpenSSL": {"kind": "distro", "notes": "How your project uses it, and how users get its fixes."}},
  "github_advisories": [{"component": "...", "repo": "owner/name"}],
  "osv_ecosystems": ["Debian:12"],
  "osv_packages": {"openssl": ["OpenSSL", "high"]},
  "nvd": [{"component": "...", "cpe": "cpe:2.3:a:vendor:product"}],
  "kev": [{"component": "...", "vendor": "...", "product": "..."}],
  "pins": [{"component": "...", "repo": "owner/name", "file": "path/in/your/repo", "var": "VERSION_VAR"}]
}
```

The `notes` of each component matter most: the routine reads them to decide whether a problem applies (does your project
install it, enable the affected feature, run on the affected platform) and what users must do. Write them as facts.

Complete examples: [`profiles/server-prep/security-watch.json`](../profiles/server-prep/security-watch.json) (a server
tool: panels, Docker, CrowdSec, 27 distro packages) and
[`profiles/agent-harness/security-watch.json`](../profiles/agent-harness/security-watch.json).

## The routine

Every 2 hours: run the collector, then for each candidate decide `issue` (the project must change), `operators` (users
must update; the Telegram digest gives the exact action) or `skip` (does not apply, with a reason). Issues get
`security`, a priority (`critical` when exploited or critical on a default setup) and never `agent-ready`: the maintainer
decides, and the hotfix lane takes over. Once a day it also runs a short web search for incidents without a CVE yet,
keeping only what a primary source confirms.
