#!/bin/sh
# factory/save-review.sh is the kit's SubagentStop hook. When a Lens returns
# its report without writing round-<N>/review-<key>.md, or a spike's builder
# returns its findings without writing findings.md, it saves that file from
# the report: the last SubagentHandback message in the agent's transcript,
# else the hook's last_assistant_message, else the transcript's last text.
# The file starts at the report's first VERDICT or ANSWER line, normalised,
# with a provenance line after it. A file the agent wrote itself, whose
# first line is already a verdict or a current ANSWER line, is left alone.
#
# It writes only inside <repo>/factory/jobs/<id>/, where <repo> comes from
# git and <id> from the first line of the agent's prompt, and only into
# folders that already exist and are not symlinks, opened one at a time. Local Lenses come from
# factory/policy.json as committed on main, never the working tree.
#
# It never fails or blocks the agent: it always exits 0, prints nothing on
# stdout, and reports a problem as one save-review.sh: line on stderr. It
# needs only sh, git and python3.

command -v python3 >/dev/null 2>&1 || {
	printf 'save-review.sh: python3 not found\n' >&2
	exit 0
}

# The main checkout is the parent of the git common dir, from the main
# checkout and from any of its worktrees alike. The full ref, so a tag or
# another ref named main is never read instead.
common=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null </dev/null) || common=
policy=$(git show refs/heads/main:factory/policy.json 2>/dev/null </dev/null) || policy=

python3 -c '
import datetime
import json
import os
import re
import stat
import sys

LENSES = {
    "reviewer-security": "security",
    "reviewer-ux": "ux",
    "reviewer-ui": "ui",
    "reviewer-code": "code",
    "spike": "spike",
}
NAME = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")
ROUND = re.compile(r" Review round ([1-9][0-9]*)\.")
VERDICTS = ("VERDICT: PASS", "VERDICT: CHANGES")
ANSWERS = ("ANSWER: yes", "ANSWER: no", "ANSWER: partly", "ANSWER: inconclusive")


class Problem(Exception):
    pass


def local_lenses(text):
    """The Lens names of the committed policy text, none when it is invalid."""
    try:
        policy = json.loads(text)
    except ValueError:
        return set()
    lenses = policy.get("lenses") if isinstance(policy, dict) else None
    if not isinstance(lenses, list):
        return set()
    names = set()
    for lens in lenses:
        name = lens.get("name") if isinstance(lens, dict) else None
        if isinstance(name, str) and NAME.fullmatch(name) and name not in LENSES.values():
            names.add(name)
    return names


def read_transcript(path):
    entries = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            if isinstance(entry, dict):
                entries.append(entry)
    return entries


def content(entry):
    message = entry.get("message")
    return message.get("content") if isinstance(message, dict) else None


def text_of(value):
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "".join(b["text"] for b in value if isinstance(b, dict) and b.get("type") == "text" and isinstance(b.get("text"), str))
    return ""


def report(entries, last_message):
    """The first of the last handback, last_message and the last text that
    is not empty."""
    handback = text = ""
    for entry in entries:
        blocks = content(entry)
        if entry.get("type") != "assistant" or not isinstance(blocks, list):
            continue
        for b in blocks:
            if not isinstance(b, dict):
                continue
            if b.get("type") == "tool_use" and b.get("name") == "SubagentHandback":
                given = b.get("input")
                message = given.get("message") if isinstance(given, dict) else None
                handback = message if isinstance(message, str) else ""
            elif b.get("type") == "text" and isinstance(b.get("text"), str) and b["text"].strip():
                text = b["text"]
    if not isinstance(last_message, str):
        last_message = ""
    for source in (handback, last_message, text):
        if source.strip():
            return source
    return ""


def normal(line):
    line = line.strip().replace("*", "")
    return line[:-1] if line.endswith(".") else line


def open_dir(fd, name):
    """An fd on the folder name in the folder fd, refusing a symlink, so
    nothing swapped in after the check can redirect a later write."""
    try:
        return os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
    except OSError:
        raise Problem(name + " is not a directory")
    finally:
        os.close(fd)


def first_line(fd, name):
    """The first line and mtime of the regular file name in the folder fd,
    or None."""
    try:
        f = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
    except OSError:
        return None
    with os.fdopen(f, encoding="utf-8", errors="replace") as f:
        info = os.fstat(f.fileno())
        if not stat.S_ISREG(info.st_mode):
            return None
        return f.readline().rstrip("\n"), info.st_mtime


def save(text, wanted, fd, name, provenance):
    """Writes name in the folder fd from text, starting at its first wanted
    line; false when it has none."""
    lines = text.split("\n")
    for i, line in enumerate(lines):
        head = normal(line)
        if head not in wanted:
            continue
        out = head + "\n" + provenance + "\n" + "\n".join(lines[i + 1:])
        if not out.endswith("\n"):
            out += "\n"
        # A new file in the same folder, renamed into place, so a reader
        # never sees part of it and a symlink at name is replaced.
        tmp = ".save-review-" + os.urandom(8).hex()
        f = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=fd)
        try:
            with os.fdopen(f, "w", encoding="utf-8", errors="replace") as f:
                f.write(out)
            os.rename(tmp, name, src_dir_fd=fd, dst_dir_fd=fd)
        except BaseException:
            try:
                os.unlink(tmp, dir_fd=fd)
            except OSError:
                pass
            raise
        return True
    return False


def started(entry):
    """The entry timestamp in seconds, or None."""
    value = entry.get("timestamp")
    if not isinstance(value, str):
        return None
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    try:
        moment = datetime.datetime.fromisoformat(value)
    except ValueError:
        return None
    return moment.timestamp() if moment.tzinfo is not None else None


def job_folder(event, common, who):
    """The transcript entries, the first user entry, the prompt and an fd
    on the job folder, checked."""
    if not common:
        raise Problem("not inside a git repository")
    repo = os.path.dirname(common)
    path = event.get("agent_transcript_path")
    if not isinstance(path, str) or not path:
        raise Problem("no agent_transcript_path for " + who)
    try:
        entries = read_transcript(path)
    except OSError as e:
        raise Problem("could not read the transcript of " + who + ": " + str(e.strerror))
    first = next((e for e in entries if e.get("type") == "user"), None)
    prompt = text_of(content(first)) if first is not None else ""
    prefix = "Job folder: "
    end = prompt.find(". Worktree: ", len(prefix))
    if not prompt.startswith(prefix) or end < 0:
        raise Problem("the prompt of " + who + " names no job folder")
    folder = prompt[len(prefix):end]
    job = os.path.basename(folder[:-1])
    jobs = os.path.dirname(folder[:-1])
    named = jobs[:-len("/factory/jobs")]
    if (not folder.endswith("/") or not NAME.fullmatch(job) or not jobs.endswith("/factory/jobs")
            or not os.path.isabs(named) or os.path.realpath(named) != os.path.realpath(repo)):
        raise Problem("the job folder of " + who + " is not <repo>/factory/jobs/<id>/")
    # The folder is opened from the repo git names and the checked id, never
    # from the prompt, one folder at a time, and none of them a symlink.
    try:
        fd = os.open(repo, os.O_RDONLY | os.O_DIRECTORY)
    except OSError:
        raise Problem(repo + " is not a directory")
    for name in ("factory", "jobs", job):
        fd = open_dir(fd, name)
    return entries, first, prompt, fd


def main(common, policy):
    try:
        event = json.loads(sys.stdin.buffer.read())
    except ValueError:
        raise Problem("the hook input is not JSON")
    if not isinstance(event, dict):
        raise Problem("the hook input is not a JSON object")
    agent = event.get("agent_type")
    if not isinstance(agent, str):
        return
    if agent != "builder" and agent not in LENSES and agent not in local_lenses(policy):
        return
    agent_id = event.get("agent_id") if isinstance(event.get("agent_id"), str) else ""
    who = agent + " " + agent_id
    provenance = "Saved by the SubagentStop hook from " + who

    if agent == "builder":
        # A builder counts only as a spike builder, so until job.json says
        # the job is a spike there is no problem to report.
        try:
            entries, first, prompt, fd = job_folder(event, common, who)
        except Problem:
            return
        try:
            with os.fdopen(os.open("job.json", os.O_RDONLY | os.O_NONBLOCK, dir_fd=fd), encoding="utf-8") as f:
                state = json.load(f)
        except (OSError, ValueError):
            return
        if not isinstance(state, dict) or state.get("kind") != "spike":
            return
        found = first_line(fd, "findings.md")
        since = started(first)
        # A valid file older than the prompt of this builder is a stale
        # one, left by an earlier pass.
        if found is not None and found[0] in ANSWERS and (since is None or found[1] >= since):
            return
        if not save(report(entries, event.get("last_assistant_message")), ANSWERS, fd, "findings.md", provenance):
            raise Problem("no ANSWER line in the report of " + who)
        return

    entries, first, prompt, fd = job_folder(event, common, who)
    m = ROUND.search(prompt)
    if m is None:
        raise Problem("the prompt of " + who + " names no review round")
    fd = open_dir(fd, "round-" + m.group(1))
    name = "review-" + LENSES.get(agent, agent) + ".md"
    found = first_line(fd, name)
    if found is not None and found[0] in VERDICTS:
        return
    if not save(report(entries, event.get("last_assistant_message")), VERDICTS, fd, name, provenance):
        raise Problem("no VERDICT line in the report of " + who)


try:
    main(sys.argv[1], sys.argv[2])
except Exception as e:
    sys.stderr.write("save-review.sh: " + " ".join(str(e).split()) + "\n")
' "$common" "$policy"
exit 0
