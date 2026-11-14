#!/usr/bin/env bash
# Tests the private-details guard of bin/bot-gh: every way gh can read a local file and post it is either scanned or
# refused, and gh posts exactly the scanned copy. No network: fake curl and gh on PATH, a throwaway key made here.
set -u
R=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin"
fail=0
ok()  { printf 'ok: %s\n' "$1"; }
bad() { printf 'not ok: %s\n' "$1"; fail=1; }

printf 'DEMO-CANARY-0000\n' > "$T/patterns"
printf 'leak DEMO-CANARY-0000 here\n' > "$T/private.md"
printf 'a clean body\n' > "$T/clean.md"
export HARNESS_CONFIG="$R/tests/fixtures/harness.json"
export HARNESS_TEST=1 HARNESS_PRIVATE_PATTERNS="$T/patterns" HARNESS_BOT_REPO=demo/repo
P=$T/private.md C=$T/clean.md

# Without a bot.env, bot-gh stops right after the guard: exit 4 + "refused" = stopped by the guard, exit 3 +
# "not configured" = the guard let it through. A timeout and an empty stdin: a regression must fail, not hang.
guard() {
    HARNESS_BOT_CONF="$T/missing.env" timeout 10 "$R/bin/bot-gh" "$@" </dev/null >/dev/null 2>"$T/err"
    echo $?
}
refused() { local d=$1; shift; [[ $(guard "$@") == 4 ]] && grep -q 'refused' "$T/err" && ok "refused: $d" || bad "should be refused: $d"; }
passes()  { local d=$1; shift; [[ $(guard "$@") == 3 ]] && grep -q 'not configured' "$T/err" && ok "passes: $d" || bad "should pass the guard: $d"; }

# private text in a file, through every form gh reads
refused "issue create --body-file"        issue create -t x --body-file "$P"
refused "issue create --body-file="       issue create -t x "--body-file=$P"
refused "issue create -F <file>"          issue create -t x -F "$P"
refused "issue create -F<file>"           issue create -t x "-F$P"
refused "issue create -F=<file>"          issue create -t x "-F=$P"
refused "issue comment -F"                issue comment 1 -F "$P"
refused "issue edit -F"                   issue edit 1 -F "$P"
refused "pr create -F"                    pr create -t x -F "$P"
refused "pr comment -F"                   pr comment 1 -F "$P"
refused "pr review -F"                    pr review 1 --comment -F "$P"
refused "pr merge -F"                     pr merge 1 -F "$P"
refused "api --input"                     api -X POST repos/demo/repo/issues --input "$P"
refused "api --input="                    api -X POST repos/demo/repo/issues "--input=$P"
refused "api -F key=@file"                api repos/demo/repo/issues -F "body=@$P"
refused "api --field key=@file"           api repos/demo/repo/issues --field "body=@$P"
refused "api --field=key=@file"           api repos/demo/repo/issues "--field=body=@$P"
refused "api -Fkey=@file"                 api repos/demo/repo/issues "-Fbody=@$P"
refused "api -F=key=@file"                api repos/demo/repo/issues "-F=body=@$P"
refused "api graphql -F query=@file"      api graphql -F "query=@$P"
refused "private text in an argument"     issue comment 1 --body "see DEMO-CANARY-0000"
refused "private text in an api field"    api repos/demo/repo/issues -f "body=DEMO-CANARY-0000"
printf 'ends with DEMO-CANARY' > "$T/half1.md"; printf -- '-0000 here\n' > "$T/half2.md"
passes  "two files are scanned one by one"  api graphql -F "a=@$T/half1.md" -F "b=@$T/half2.md"
printf 'no final newline' > "$T/nonl.md"
refused "a pattern at the start of the next file" api graphql -F "a=@$T/nonl.md" -F "b=@$P"

# `--` as the value of the flag before it: gh keeps reading flags after it, so the guard does too
refused "-t -- -F <file>"                 issue create -t -- -F "$P"
refused "--title -- --body-file <file>"   issue create --title -- --body-file "$P"
refused "api -H -- -F key=@file"          api repos/demo/repo/issues -H -- -F "body=@$P"
refused "api -X -- --input <file>"        api repos/demo/repo/issues -X -- --input "$P"
refused "-b -- -F - (stdin)"              issue create -t x -b -- -F -
refused "-B -- --fill"                    pr create -t x -B -- --fill
refused "a file name starting with -"     issue comment 1 --body-file -F
refused "a field that is a flag"          api graphql -F --input

# api placeholders: gh fills them from local git after the check
refused "api {owner}/{repo} endpoint"     api 'repos/{owner}/{repo}/issues' -f title=x
refused "api -F title={branch}"           api repos/demo/repo/issues -F 'title=work on {branch}'
refused "api :owner/:repo endpoint"       api 'repos/:owner/:repo/issues' -f title=x
refused "api -F title=:branch"            api repos/demo/repo/issues -F 'title=work on :branch'
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 refused "api :branch followed by é (any locale)" api repos/demo/repo/issues -F 'title=see :branché'
passes  "a GraphQL variable is not a placeholder" api graphql -f 'query=query($owner:String!) { x }'

# ways to post local text the guard cannot check: refused even when the text is clean
refused "release create --notes-file"     release create v1 --notes-file "$C"
refused "release upload (an asset)"       release upload v1 "$C"
refused "gist create"                     gist create "$C"
refused "no command"
refused "issue create --recover"          issue create --recover "$C"
refused "issue create --recover="         issue create "--recover=$C"
refused "issue create -T"                 issue create -t x -T bug_report
refused "issue create --template"         issue create -t x --template bug_report
refused "issue comment -e"                issue comment 1 -e
refused "issue comment --editor"          issue comment 1 --editor
refused "pr create --fill"                pr create --fill
refused "pr create -f"                    pr create -f
refused "pr create --fill-verbose"        pr create --fill-verbose
refused "pr create -df (bundled)"         pr create -df
refused "pr review -aF (bundled)"         pr review 1 -aF "$C"
refused "api -iF (bundled)"               api repos/demo/repo/issues -iF "body=@$C"
refused "--body-file - (stdin)"           issue comment 1 --body-file -
refused "-F - (stdin)"                    issue comment 1 -F -
refused "api --input - (stdin)"           api graphql --input -
refused "api -F key=@- (stdin)"           api graphql -F query=@-
refused "a missing file"                  issue comment 1 --body-file "$T/nope.md"
refused "a missing file after -F"         issue comment 1 -F
refused "/dev/stdin (not a regular file)" issue comment 1 --body-file /dev/stdin
mkfifo "$T/fifo"
refused "a named pipe"                    issue comment 1 --body-file "$T/fifo"
ln -s "$P" "$T/link.md"
refused "a symlink to a private file"     issue comment 1 --body-file "$T/link.md"

# what the routines use: let through when clean
passes "issue create --body-file"         issue create -t x --body-file "$C" --label bug
passes "issue create --body-file="        issue create -t x "--body-file=$C"
passes "issue create -F<file>"            issue create -t x "-F$C"
passes "issue create -F=<file>"           issue create -t x "-F=$C"
passes "issue edit -F"                    issue edit 1 -F "$C"
passes "pr comment -F"                    pr comment 1 -F "$C"
passes "pr review -F"                     pr review 1 --comment -F "$C"
passes "pr merge -F"                      pr merge 1 -F "$C"
passes "api --input="                     api graphql "--input=$C"
passes "api --field key=@file"            api graphql --field "query=@$C"
passes "api --field=key=@file"            api graphql "--field=query=@$C"
passes "api -Fkey=@file"                  api graphql "-Fquery=@$C"
passes "api -F=key=@file"                 api graphql "-F=query=@$C"
passes "api -i -F (not bundled)"          api graphql -i -F "query=@$C"
passes "the routines' issue create"       issue create -R demo/repo --title "Proposal: x" --label enhancement --body-file "$C"
passes "issue comment -F"                 issue comment 1 -F "$C"
passes "pr create --body-file"            pr create -t x --body-file "$C" --base main
passes "api -F body=@file"                api -X POST repos/demo/repo/issues/1/comments -F "body=@$C"
passes "api --input"                      api graphql --input "$C"
passes "api -F n=5 (no file)"             api -X PATCH repos/demo/repo/issues/1 -F milestone=5
passes "api -f query=... with F in it"    api graphql -f 'query=mutation { Foo }'
passes "api -fquery=... (attached value)" api graphql '-fquery=mutation { Foo }'
passes "api -f body=@x (raw, not a file)" api repos/demo/repo/issues -f 'body=@not-a-file'
passes "-- as text"                       issue comment 1 --body x --
passes "label create"                     label create demo --description "a label" --color 000000

# a TMPDIR whose path matches a private pattern: the copies' path is never scanned, nor sent
mkdir -p "$T/DEMO-CANARY-0000"
[[ $(TMPDIR="$T/DEMO-CANARY-0000" guard issue comment 1 --body-file "$C") == 3 ]] \
    && ok "the temporary path is not part of the scanned text" || bad "temporary path scanned"

# with a bot.env: gh gets the scanned copy, not the original path, and the copy is removed afterwards
openssl genrsa -out "$T/key.pem" 2048 2>/dev/null
printf 'APP_ID=1\nKEY_FILE=%s\nINSTALLATION_ID=2\n' "$T/key.pem" > "$T/bot.env"
printf '#!/bin/sh\necho "{\\"token\\": \\"demo-token\\"}"\n' > "$T/bin/curl"
cat > "$T/bin/gh" <<EOF
#!/usr/bin/env bash
printf '%s\n' "\$@" > "$T/gh-args"
for a in "\$@"; do
    f=\$a; [[ \$a == *=@* ]] && f=\${a#*=@}
    [[ -f \$f ]] && { cat -- "\$f" > "$T/gh-body"; echo "\$f" > "$T/gh-path"; }
done
[[ \$GH_TOKEN == demo-token ]] || exit 9
exit 7
EOF
chmod +x "$T/bin/curl" "$T/bin/gh"
live() { rm -f "$T"/gh-*; PATH="$T/bin:$PATH" HARNESS_BOT_CONF="$T/bot.env" timeout 20 "$R/bin/bot-gh" "$@" </dev/null >/dev/null 2>&1; }
live issue comment 1 -F "$C"; rc=$?
[[ $rc == 7 ]] && ok "gh's exit code is passed on, with the app token" || bad "gh exit code ($rc)"
cmp -s "$T/gh-body" "$C" && ok "gh posts the same text that was scanned" || bad "posted text differs"
copy=$(cat "$T/gh-path" 2>/dev/null)
[[ -n $copy && $copy != "$C" ]] && ok "gh gets the copy, not the original path" || bad "gh got the original path"
[[ ! -e $copy ]] && ok "the copy is removed after gh" || bad "copy left behind"
grep -qx -- "-F" "$T/gh-args" && grep -qx 1 "$T/gh-args" && ok "the other arguments reach gh unchanged" || bad "arguments"

live api graphql -F "query=@$C" -f x=@y
copy=$(cat "$T/gh-path" 2>/dev/null)
[[ -n $copy && $copy != "$C" ]] && cmp -s "$T/gh-body" "$C" && grep -qx "query=@$copy" "$T/gh-args" \
    && ok "api fields point at a copy with the same text" || bad "api field rewrite"
grep -qx 'x=@y' "$T/gh-args" && ok "raw fields (-f) are left as typed" || bad "raw field changed"
live issue create -t x "--body-file=$C"
copy=$(cat "$T/gh-path" 2>/dev/null)
[[ -n $copy && $copy != "$C" ]] && cmp -s "$T/gh-body" "$C" && ok "--body-file= also gets the copy" || bad "--body-file= rewrite"
exit "$fail"
