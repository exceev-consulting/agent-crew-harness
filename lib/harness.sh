# shellcheck shell=bash
# Shared settings for the bash helpers: source it, then call hconf KEY (from harness.json, or $HARNESS_CONFIG).
HARNESS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
HARNESS_CONFIG=${HARNESS_CONFIG:-$HARNESS_DIR/harness.json}
hconf() {
    local v
    v=$(jq -r --arg k "$1" '.[$k] // empty' "$HARNESS_CONFIG" 2>/dev/null)
    [[ -n $v ]] || { echo "harness: '$1' missing in $HARNESS_CONFIG" >&2; return 3; }
    printf '%s' "$v"
}
