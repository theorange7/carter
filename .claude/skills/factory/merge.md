# Factory: Merge

Part of the factory skill, read from `SKILL.md`.

### Merge

Merge only the commit the Lenses reviewed. First check that
`git rev-parse factory/<job-id>` prints `rounds[<round>].head`, where
`<round>` is `job.json`'s `round`; that commit is `<sha>` below. When it
prints anything else, or `head` is missing, merge nothing: set
`stage: "needs-human"` and
`reason: "branch moved since review; run /factory rework <job-id> <note>"`
in one `job.json` write, then continue at **Needs human**.

Then take the merge lock, so only one job merges into the main checkout at a
time. In the main checkout, run

```bash
mkdir factory/jobs/.merge.lock && echo "<job-id> $(date -u +%Y-%m-%dT%H:%M:%SZ)" > factory/jobs/.merge.lock/owner
```

When the `mkdir` fails, another job holds the lock: Read
`factory/jobs/.merge.lock/owner`, which holds that job's id and the UTC time
it took the lock. When the file is missing or unreadable, or its time is
more than 15 minutes before now (`date -u +%Y-%m-%dT%H:%M:%SZ`), the lock is
stale: remove it with `rm -rf factory/jobs/.merge.lock`, take it as above,
and say so in your report. Otherwise run `sleep 30` and try again, checking
for a stale lock each time, up to 5 times. When the lock is still held, set
`stage: "needs-human"` and
`reason: "main is being merged by <the job id in owner>"` in one `job.json`
write, then continue at **Needs human**.

You hold the lock through the merge, the changelog commit and the ADR
commits. Every exit from **Merge** after taking it, success or failure,
first removes it with `rm -rf factory/jobs/.merge.lock`.

Merging happens in the main checkout, which must be on `main` with no
tracked changes apart from the backlog. Run these checks in order. When one
fails, the job still counts as approved: remove the lock, make the one
`job.json` write it names, then continue at **Needs human**, telling the user
that `/factory approve <job-id>` will finish the merge once the checkout is
back on `main` and clean. Nothing further runs.

1. `git branch --show-current` must print `main`. Otherwise set
   `stage: "needs-human"` and `reason: "main checkout busy: not on main"`.
2. `git status --porcelain --untracked-files=no -- . ':!factory/backlog.md'`
   must print nothing. Otherwise set `stage: "needs-human"` and
   `reason: "main checkout busy: <lines>"`, where `<lines>` is every line it
   printed, each trimmed of leading and trailing whitespace, joined with `, `
   into one line, such as `main checkout busy: M src/app.ts, A docs/x.md`.

The backlog is exempt because every `/factory next` edits it and no job branch
ever does, so a modified backlog can't conflict. Untracked files don't count
because `git merge` refuses to overwrite an untracked file: one the branch
doesn't touch can't be lost, and one it does touch makes the merge fail
(below). When both checks pass, merge:

```bash
git merge --no-ff <sha> -m "Merge factory/<job-id>"
```

When the merge fails, take these steps in order:

1. Work out the `reason`, one line, from the first rule that applies:
   - git printed `The following untracked working tree files would be overwritten by merge:`:
     the reason is `"merge failed: untracked files would be overwritten: <paths>"`,
     where `<paths>` are the tab-indented paths git listed under that line,
     each trimmed, joined with `, `.
   - The merge stopped with conflicts: the reason is
     `"merge failed: conflicts in <paths>"`, where `<paths>` are what
     `git diff --name-only --diff-filter=U` prints, joined with `, `. Run
     that command before any abort, because an abort clears the list.
   - Any other failure: the reason is
     `"merge failed: <git's first line of output>"`.
2. When git reports a merge in progress, run `git merge --abort`. After an
   untracked-file refusal none is in progress. Then remove the lock.
3. Set `stage: "needs-human"` and that `reason` in one `job.json` write.
4. Continue at **Needs human**, telling the user that
   `/factory approve <job-id>` will finish the merge once the cause is
   cleared, such as the listed files moved or removed.

After a successful merge, record the changelog entry. Take the line under
`## Changelog` in `decision.md`. If it exists and isn't empty, and
`factory/CHANGELOG.md` exists, get today's date with `date -u +%Y-%m-%d` and
use the Edit tool to add one line after the last line of
`factory/CHANGELOG.md` in the main checkout:

```
- <YYYY-MM-DD> <job-id>: <changelog line>
```

Commit that file alone on `main`:

```bash
git add factory/CHANGELOG.md
git commit -m "Add <job-id> to the changelog"
```

No `## Changelog` line (the decisions you write yourself have none)
or no `factory/CHANGELOG.md` means no entry: say so in your report and go on.
A failed changelog commit doesn't undo the merge: report what git printed and
go on.

Then record the decision's accepted risks as ADRs. The entries are the
`### <title>` blocks under `## Accepted risks` in `decision.md`, up to the
next `## ` heading. No `## Accepted risks` section (the decisions you write
yourself have none), `None.`, or no `###` entry means no ADR: say so in your
report and go on. Otherwise give each entry a file in the main checkout:

- **Number.** Glob `docs/adr/*.md`, take the highest four-digit `NNNN` among
  the files named `NNNN-*.md`, and add one, zero-padded to four digits. Use
  `0001` when there are none or the folder is missing. Several entries get
  consecutive numbers, in decision order.
- **Slug.** Lowercase the title and replace each run of characters other than
  `a`–`z` and `0`–`9` with one hyphen. Trim hyphens at both ends and cut it to
  60 characters, trimming any trailing hyphen again. Use `accepted-risk` if
  nothing is left.
- **File.** Write `docs/adr/<NNNN>-<slug>.md` with the Write tool, which
  creates `docs/adr/` when it is missing. Get the date with
  `date -u +%Y-%m-%d`. The entry's body goes in word for word, its
  `Revisit when:` line included:

  ```
  # <title>

  <the entry's body>

  Accepted at the merge of <job-id>, <YYYY-MM-DD>.
  ```

Commit those files alone on `main`:

```bash
git add docs/adr/<file> …
git commit -m "Record the accepted risks of <job-id>"
```

A failed write or commit doesn't undo the merge: report what failed and which
risks went unrecorded, and go on. Then release the lock:

```bash
rm -rf factory/jobs/.merge.lock
```

Finally clean up:

```bash
git worktree remove <worktree>
git branch -d factory/<job-id>
```

Finish by setting `stage: "merged"`. A failed `git worktree remove` also leaves
the job merged; pass on what it printed. Nothing is ever pushed: under
`merge: "pr"` the Control Plane pushes, after **PR hand-off** below.

### PR hand-off

Under `merge: "pr"` an APPROVE never merges. You commit the decision's
changelog line and accepted risks on the job's branch, as its last commits,
and hand the branch to the Control Plane, which pushes it and opens or
updates its pull request; a human merges that on the forge. Nothing here
touches the main checkout or commits on `main`: in a merge `"pr"` Factory,
only the Control Plane's fast-forward from the remote moves `main`. Every
git command below runs in the job's worktree: a read with
`git -C <worktree>`, and each `add` and `commit` as one Bash call that
starts `cd <worktree> && `, as written, so it matches the kit's `git add`
and `git commit` rules. Take these steps in order. A failed step sets `stage: "needs-human"` with
the `reason` it names in one `job.json` write, then continues at **Needs
human**, and nothing further runs.

1. **Reviewed sha.** Let `<head>` be `rounds[<round>].head`, where
   `<round>` is `job.json`'s `round`. `git -C <worktree> branch
   --show-current` must print `factory/<job-id>`. Then either
   `git -C <worktree> rev-parse HEAD` prints `<head>`, or the commits after
   it are an earlier hand-off's: `git -C <worktree> merge-base
   --is-ancestor <head> HEAD` succeeds and `git -C <worktree> diff
   --name-status <head> HEAD` lists only `factory/changelog.d/<job-id>.md`
   and added (`A`) `docs/adr/<NNNN>-*.md` files. In that second case skip
   steps 2 and 3. Anything else, or a missing `head`, is the reason
   `"branch moved since review; run /factory rework <job-id> <note>"`.
2. **Changelog fragment.** Take the line under `## Changelog` in
   `decision.md`. No line, or an empty one, means no fragment: say so in
   your report and go on. Otherwise get today's date with
   `date -u +%Y-%m-%d` and use the Write tool to write
   `<worktree>/factory/changelog.d/<job-id>.md` holding the single line
   `- <YYYY-MM-DD> <job-id>: <changelog line>` and a newline; when the file
   already exists, as after a rework, Read it first and write it all the
   same. Then stage it:
   ```bash
   cd <worktree> && git add factory/changelog.d/<job-id>.md && git diff --cached --name-only
   ```
   When that prints nothing, the content was unchanged: skip the commit.
   Otherwise commit it alone:
   ```bash
   cd <worktree> && git commit -m "Add <job-id>'s changelog fragment" -- factory/changelog.d/<job-id>.md
   ``` A failed commit
   is the reason `"pr hand-off failed: <git's first line of output>"`.
3. **ADRs.** The entries are those **Merge** reads, from `## Accepted
   risks`; none means no ADR: say so in your report and go on. Number them
   against `main`, not the worktree: take the highest four-digit `NNNN`
   among the `docs/adr/NNNN-*.md` names
   `git -C <worktree> log --format= --name-only main -- docs/adr/` prints
   and add one, `0001` when there are none, consecutive in decision order. Skip an entry whose `# <title>` already heads a file that
   `git -C <worktree> diff --name-only --diff-filter=A main...HEAD --
   docs/adr/` lists, written by an earlier hand-off. Write each file as
   **Merge** does, slug and body alike, at `<worktree>/docs/adr/<NNNN>-<slug>.md`.
   Commit those files alone:
   ```bash
   cd <worktree> && git add docs/adr/<file> … && git commit -m "Record the accepted risks of <job-id>" -- docs/adr/<file> …
   ```
   A failed write or commit is the reason
   `"pr hand-off failed: <what failed, one line>"`.
4. **Hand off.** Set `stage: "approved"` in one `job.json` write and end
   your turn: `approved` is no halt (see **Halts**). Tell the user that the
   Control Plane pushes `factory/<job-id>` and opens its pull request at its
   next pass, and that only a `factory serve` with this Factory registered
   does: a hand-run job waits at `approved` until one runs. Its push step
   accepts after `<head>` only the fragment and new ADR files, so commit
   nothing else.
