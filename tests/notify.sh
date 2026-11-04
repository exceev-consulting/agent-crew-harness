#!/usr/bin/env bash
# Tests bin/notify against a fake Telegram API on 127.0.0.1. No real message is sent.
set -u
R=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d); trap 'kill $pid 2>/dev/null; rm -rf "$T"' EXIT
port=$(( 20000 + RANDOM % 20000 ))
python3 -I "$R/tests/fake-telegram.py" "$port" "$T/req.log" & pid=$!
sleep 0.7
export HARNESS_CONFIG="$R/tests/fixtures/harness.json"
printf "DEMO-CANARY-0000\n" > "$T/patterns"
export HARNESS_PRIVATE_PATTERNS="$T/patterns"
export HARNESS_TEST=1 HARNESS_TELEGRAM_API="http://127.0.0.1:$port" HARNESS_TELEGRAM_CONF="$T/telegram.env"
fail=0
ok()  { printf 'ok: %s\n' "$1"; }
bad() { printf 'not ok: %s\n' "$1"; fail=1; }
last() { tail -1 "$T/req.log"; }

"$R/bin/notify" "hello" 2>/dev/null; [[ $? == 3 ]] && ok "not configured exits 3" || bad "not configured exits 3"
"$R/bin/notify" --status >/dev/null; [[ $? == 3 ]] && ok "--status says not configured" || bad "--status not configured"

printf "TELEGRAM_BOT_TOKEN='123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcd'\nTELEGRAM_CHAT_ID=-1001234\n" > "$T/telegram.env"
"$R/bin/notify" --status >/dev/null && ok "--status says configured" || bad "--status configured"

printf "TELEGRAM_BOT_TOKEN='123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcd'\nTELEGRAM_CHAT_ID=-1001234\nTELEGRAM_QUIET_HOURS=off\n" > "$T/telegram.env"
"$R/bin/notify" --title "CRITICAL #12" "Issue body & <tags> *stars*" && ok "send exits 0" || bad "send exits 0"
last | jq -e '.path == "/bot123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcd/sendMessage" and .form.chat_id == "-1001234"
    and .form.text == "CRITICAL #12\nIssue body & <tags> *stars*" and .form.disable_notification == "false"
    and (.form | has("parse_mode") | not)' >/dev/null && ok "plain text to the right chat" || { bad "message format"; last; }

echo "from stdin" | "$R/bin/notify" --silent && last | jq -e '.form.text == "from stdin" and .form.disable_notification == "true"' >/dev/null \
    && ok "stdin and --silent" || bad "stdin and --silent"

"$R/bin/notify" --title "Run failed" "details DEMO-CANARY-0000 here" && last | jq -e '(.form.text | test("withheld")) and (.form.text | test("CANARY") | not)' >/dev/null \
    && ok "private details are withheld, the ping still goes" || bad "private details withheld"

long=$(head -c 5000 /dev/zero | tr '\0' a)
"$R/bin/notify" "$long" && last | jq -e '(.form.text | length) < 3600 and (.form.text | endswith("[cut]"))' >/dev/null \
    && ok "long text is cut" || bad "long text is cut"

# Quiet hours: a window that always contains "now" makes every message silent.
h=$((10#$(date +%H)))
printf "TELEGRAM_BOT_TOKEN='123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcd'\nTELEGRAM_CHAT_ID=-1001234\nTELEGRAM_QUIET_HOURS=%d-%d\n" "$h" $(( (h + 1) % 24 )) > "$T/telegram.env"
"$R/bin/notify" "at night" && last | jq -e '.form.disable_notification == "true"' >/dev/null && ok "quiet hours make a message silent" || bad "quiet hours"
printf "TELEGRAM_BOT_TOKEN='123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcd'\nTELEGRAM_CHAT_ID=-1001234\nTELEGRAM_QUIET_HOURS=%d-%d\n" $(( (h + 1) % 24 )) $(( (h + 2) % 24 )) > "$T/telegram.env"
"$R/bin/notify" "by day" && last | jq -e '.form.disable_notification == "false"' >/dev/null && ok "outside quiet hours a message rings" || bad "outside quiet hours"

# A token built at run time, so it is on no command line of this test itself.
tail=$(printf 'Q%.0s' {1..30})
printf 'TELEGRAM_BOT_TOKEN=777000:%s\nTELEGRAM_CHAT_ID=-1001234\n' "$tail" > "$T/telegram.env"
( "$R/bin/notify" "token check" & sleep 0.05; ps -eo args | grep -c "[7]77000:$tail" > "$T/ps"; wait )
[[ $(cat "$T/ps") == 0 ]] && ok "the token is not on any command line" || bad "token visible in ps"

printf "TELEGRAM_BOT_TOKEN=BADTOKEN:ABCDEFGHIJKLMNOPQRSTUVWXYZ\nTELEGRAM_CHAT_ID=1\n" > "$T/telegram.env"
"$R/bin/notify" "x" 2>/dev/null; [[ $? == 3 ]] && ok "a malformed token counts as not configured" || bad "malformed token"

printf 'TELEGRAM_BOT_TOKEN=999:$(touch %s/pwned)xxxxxxxxxxxxxxxxxxxx\nTELEGRAM_CHAT_ID=1\n' "$T" > "$T/telegram.env"
"$R/bin/notify" "x" 2>/dev/null; [[ ! -e $T/pwned ]] && ok "the config file is never executed" || bad "config executed"

# --setup through a pseudo-terminal: token typed, the one chat found, saved 600, test message sent.
if command -v script >/dev/null; then
    rm -f "$T/telegram.env"
    tok="424242:$(printf 'W%.0s' {1..30})"
    # typed after the prompt, like a person: before it, the terminal still echoes
    { sleep 1; printf '%s\n' "$tok"; } | script -qec "$R/bin/notify --setup" /dev/null > "$T/setup.out" 2>&1
    if grep -qx "TELEGRAM_CHAT_ID=555" "$T/telegram.env" 2>/dev/null && grep -q "^TELEGRAM_BOT_TOKEN=424242:" "$T/telegram.env" \
        && [[ $(stat -c %a "$T/telegram.env") == 600 ]] && last | jq -e '.form.chat_id == "555" and (.form.text | test("notifications are on"))' >/dev/null \
        && ! grep -q "424242:W" "$T/setup.out"; then
        ok "--setup saves the chat, keeps the file private, sends a test and never prints the token"
    else
        bad "--setup"; cat "$T/setup.out"
    fi
fi

exit "$fail"
