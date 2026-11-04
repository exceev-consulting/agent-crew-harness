#!/usr/bin/env bash
# Builds the status board page from status-board/app (install its dependencies first:
# cd status-board/app && pnpm install --frozen-lockfile).
#
#   status-board/build.sh [--snapshot FILE] [--app DIR]
#
# Writes status-board/dist/status-board.html, the page to publish as a Claude artifact (no document skeleton: the
# artifact adds it), titled "<project> Status Board" from harness.json (or $HARNESS_CONFIG), and
# status-board/dist/preview.html, a full document for local checks that fakes the artifact's db with a snapshot
# (--snapshot, default <harness_dir>/state/status-board/out/snapshot.json; an empty page without one).
# --app builds another copy of the app folder (one with its node_modules), for example a scratch copy.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
app=$here/app
snapshot=
while (( $# )); do
    case $1 in
        --snapshot) snapshot=${2:?--snapshot FILE}; shift 2 ;;
        --app) app=$(cd "${2:?--app DIR}" && pwd); shift 2 ;;
        -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
        *) echo "build.sh: unknown argument $1" >&2; exit 2 ;;
    esac
done
[[ -x $app/node_modules/.bin/vite ]] || {
    echo "build.sh: no node_modules in $app: run 'pnpm install --frozen-lockfile' there first" >&2; exit 3; }

project=$(python3 -I -c 'import sys; sys.path.insert(0, sys.argv[1]); import harness; print(harness.load()["project"])' "$here/../lib")
if [[ -z $snapshot ]]; then
    hdir=$(python3 -I -c 'import sys; sys.path.insert(0, sys.argv[1]); import harness; print(harness.load()["harness_dir"])' "$here/../lib")
    snapshot=$hdir/state/status-board/out/snapshot.json
fi

build=$(mktemp -d); trap 'rm -rf "$build"' EXIT
(cd "$app" && ./node_modules/.bin/vite build --base ./ --logLevel warn --outDir "$build" --emptyOutDir)
mkdir -p "$here/dist"
python3 -I - "$build" "$here/dist" "$project" "$snapshot" <<'PY'
import glob, html, pathlib, sys
build, dist, project, snapshot = sys.argv[1:5]
css = pathlib.Path(glob.glob(f"{build}/assets/*.css")[0]).read_text()
js = pathlib.Path(glob.glob(f"{build}/assets/*.js")[0]).read_text().replace("</script", "<\\/script")
head = f"""<title>{html.escape(project)} Status Board</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
"""
page = f"{head}<style>{css}</style>\n<div id=\"root\"></div>\n<script type=\"module\">{js}</script>\n"
out = pathlib.Path(dist)
(out / "status-board.html").write_text(page)
snap = pathlib.Path(snapshot)
mock = ""
if snap.is_file():
    data = snap.read_text().replace("</", "<\\/")
    mock = ("<script>window.claude={use:async(n)=>n==='db'?{doc:()=>({onSnapshot(next){"
            f"setTimeout(()=>next({{exists:true,data:()=>({data})}}),50);return()=>{{}}}}}})}}:null}};</script>\n")
(out / "preview.html").write_text("<!doctype html><html><head><meta charset=utf-8>"
    "<meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\"></head><body>"
    + mock + page + "</body></html>")
print(f"status-board.html: {len(page)} bytes; preview.html: {'with ' + snapshot if mock else 'no snapshot'}")
PY
