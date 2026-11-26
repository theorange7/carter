#!/bin/sh
# factory/ci.sh <job-id> <N> runs the policy's CI command for round N of a
# job. The command comes only from factory/policy.json as committed on main,
# never the main checkout's working tree or the job branch, and runs in the
# job's worktree. Its output goes to factory/jobs/<job-id>/round-<N>/ci.log
# and never to stdout, which gets one line: ci: PASS (exit 0) or ci: FAIL
# (exit 1). A problem that keeps the command from running is one ci.sh: line
# on stderr, with exit 2.
#
# The script is standalone, so it runs unchanged on a remote CI runner. It
# needs only sh, git, python3 and a local main branch. It takes every path
# from git and its two arguments, and uses no HOME, fixed path or
# environment variable. A runner provides a checkout on factory/<job-id>,
# a local main and a factory/jobs/<job-id>/ folder.

fail() {
	printf 'ci.sh: %s\n' "$1" >&2
	exit 2
}

[ "$#" -eq 2 ] || fail "usage: factory/ci.sh <job-id> <N>"
job=$1
n=$2
case $job in
'' | -* | *- | *--* | *[!abcdefghijklmnopqrstuvwxyz0123456789-]*)
	fail "bad job id; usage: factory/ci.sh <job-id> <N>" ;;
esac
case $n in
'' | 0* | *[!0123456789]*)
	fail "bad round; usage: factory/ci.sh <job-id> <N>" ;;
esac

# The main checkout is the parent of the git common dir, from the main
# checkout and from any of its worktrees alike.
common=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) ||
	fail "not inside a git repository"
main=$(dirname "$common")

# The job's worktree is whichever one has factory/<job-id> checked out; git
# lets only one do so. Locally that is ../<repo>-factory/<job-id>, and on a
# runner it can be the clone itself.
worktree=$(git worktree list --porcelain 2>/dev/null |
	awk -v b="branch refs/heads/factory/$job" '/^worktree /{w=substr($0,10)} $0==b{print w}')
[ -n "$worktree" ] && [ -d "$worktree" ] ||
	fail "no worktree on branch factory/$job"

[ -d "$main/factory/jobs/$job" ] || fail "no job folder factory/jobs/$job"

# The full ref, so a tag or another ref named main is never read instead.
json=$(git show refs/heads/main:factory/policy.json 2>/dev/null) ||
	fail "factory/policy.json: not on main"
command -v python3 >/dev/null 2>&1 || fail "python3 not found"
# python3 prints "s<ci>." for a string, so command substitution keeps any
# trailing newline, and exits 3 for null. A problem is one line, exit 1.
policy=$(printf '%s\n' "$json" | python3 -c '
import json
import sys

try:
    policy = json.loads(sys.stdin.buffer.read())
    if not isinstance(policy, dict) or "ci" not in policy:
        raise ValueError("no ci key in an object")
    ci = policy["ci"]
    if ci is None:
        sys.exit(3)
    if not isinstance(ci, str):
        raise ValueError("ci is neither a string nor null")
    sys.stdout.buffer.write(("s" + ci + ".").encode("utf-8", "surrogatepass"))
except Exception as e:
    print(" ".join(str(e).split()))
    sys.exit(1)
')
status=$?
case $status in
0)
	ci=${policy#s}
	ci=${ci%.}
	;;
1) fail "factory/policy.json: $policy" ;;
3) ;;
*) fail "python3 failed with exit $status" ;;
esac

mkdir -p "$main/factory/jobs/$job/round-$n" 2>/dev/null ||
	fail "could not create factory/jobs/$job/round-$n"
log="factory/jobs/$job/round-$n/ci.log"
{ : >"$main/$log"; } 2>/dev/null || fail "could not write $log"

if [ "$status" -eq 3 ]; then
	echo "ci: null in factory/policy.json; nothing to run" | tee "$main/$log"
	exit 0
fi

cd "$worktree" || fail "could not enter $worktree"
sh -c "$ci" </dev/null >"$main/$log" 2>&1
code=$?
if [ "$code" -eq 0 ]; then
	echo "ci: PASS"
	exit 0
fi
echo "ci: FAIL (exit $code); log: $log"
exit 1
