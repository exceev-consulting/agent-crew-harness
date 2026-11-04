#!/usr/bin/env bash
# Tests bin/harness-watchdog with a fake clock, a fake app check and a fake sender.
set -u
R=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/state"
printf '#!/usr/bin/env bash\nshift 2; printf "%%s\\n" "$*" >> "%s/sent"\n' "$T" > "$T/fake-notify"; chmod +x "$T/fake-notify"
export HARNESS_CONFIG="$R/tests/fixtures/harness.json"
export HARNESS_TEST=1 WATCHDOG_NOTIFY="$T/fake-notify" WATCHDOG_STATE="$T/state"
fail=0
ok()  { printf 'ok: %s\n' "$1"; }
bad() { printf 'not ok: %s\n' "$1"; fail=1; }
at() { date -d "2026-11-03 $1" +%s; }
run() { WATCHDOG_NOW=$(at "$1") WATCHDOG_APP=$2 "$R/bin/harness-watchdog"; }
sent() { [[ -f $T/sent ]] && wc -l < "$T/sent" || echo 0; }

run 10:00 up; [[ $(sent) == 0 ]] && ok "app up, no routine state yet: nothing sent" || bad "quiet start"
run 10:00 down; grep -q "desktop app is not running" "$T/sent" && ok "app down: one alert" || bad "app down alert"
run 10:30 down; [[ $(sent) == 1 ]] && ok "no repeat within 6 hours" || bad "repeat too soon"
run 16:31 down; [[ $(sent) == 2 ]] && ok "a reminder after 6 hours" || bad "6 h reminder"
run 17:00 up; tail -1 "$T/sent" | grep -q "Back to normal: app" && ok "recovery message" || bad "recovery"
run 17:30 up; [[ $(sent) == 3 ]] && ok "silence once fine" || bad "silence when fine"

printf '{"generated": "%s"}\n' "$(date -d '2026-11-03 18:00' -Is)" > "$T/state/sentinel-plan.json"
run 18:30 up; [[ $(sent) == 3 ]] && ok "sentinel ran 30 min ago: fine" || bad "fresh sentinel"
run 19:20 up; tail -1 "$T/sent" | grep -q "sentinel has not run for 80 minutes" && ok "sentinel stale after 75 min" || bad "stale sentinel"
printf '{"generated": "%s"}\n' "$(date -d '2026-11-02 23:30' -Is)" > "$T/state/sentinel-plan.json"
rm -f "$T/state/watchdog.json"; : > "$T/sent"
run 07:20 up; [[ $(sent) == 0 ]] && ok "no sentinel alert before 07:45 (its night pause)" || bad "night pause"

printf '{"since": {"github": "%s"}}\n' "$(date -d '2026-11-03 01:05' -Is)" > "$T/state/security-watch.json"
run 04:50 up; grep -q "security watch has not read" "$T/sent" && bad "security watch alert too early" || ok "security watch 4 h old: fine"
run 08:10 up; grep -q "security watch has not read the GitHub advisories for 7 hours" "$T/sent" && ok "security watch stale after 5 h" || bad "secwatch stale"

printf '#!/usr/bin/env bash\nexit 5\n' > "$T/fake-notify"
rm -f "$T/state/watchdog.json"
run 10:00 down
jq -e '.app.alerted' "$T/state/watchdog.json" >/dev/null 2>&1 && bad "a failed send is not recorded" || ok "a failed send is retried next time"
exit "$fail"
