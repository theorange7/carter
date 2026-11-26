# Factory: spec, approve and rework

Part of the factory skill, read from `SKILL.md`.

## /factory spec <inbox-file>

`<inbox-file>` must be a bare file name sitting directly in `factory/inbox/`.
If it contains a `/`, or `test -f factory/inbox/<inbox-file>` fails, stop and
tell the user.

1. **Create the job.** Read the `title:` from the file's frontmatter, if any.
   Choose the number and claim the folder with `mkdir`, exactly as in step 1
   of **/factory <feature>**. The slug follows that step's 2–4 word kebab-case
   rule, built from the `title:` or, failing that, the file name minus `.md`.
2. **Claim the file** immediately after the `mkdir`, before anything else:
   ```bash
   mv factory/inbox/<inbox-file> factory/jobs/<job-id>/spec.md
   ```
   Both paths share a filesystem, so the move is atomic. If it fails because
   the file is gone, another session took it: `rmdir factory/jobs/<job-id>`,
   tell the user, and stop. Never edit the file's contents: its frontmatter
   `id:` must survive the move, since that is how other lines and Specs find
   this Job.
3. **Write `job.json`** as in step 1, with `feature` set to the `title:` or,
   failing that, the file name minus `.md`, and as a spike's when `spec.md`
   is one (see **Spikes** in `spikes.md`).
4. Create the worktree as in step 2 (**Worktree**). There is no **Spec** step
   and no spec-writer; go straight on to step 4 (**Build**), which for a spike
   is its **Build pass** (`spikes.md`).

## /factory approve <job-id>

Only for a job in `needs-human`. For a feature, make one `job.json` write
before running **Merge** for it: set `stage: "approve"`, set `pid`,
`session_id` and `origin`, read afresh as **/factory rework** step 2 does
(deleting the old value when the new one comes back empty or the echo was
refused), and delete `reason`. Then run the **Worktree check** below, then
run **Merge**: Read `merge.md` and follow it. A busy or failed merge then
enters `needs-human` afresh, so the Control Plane sends a `needs-human`
Notification whose `Reason` is the merge's `reason`, and the fresh identity
keeps reconcile from judging the earlier orchestrator's session as this
run's. The policy's `merge` mode is not applied again: this command is the
human's approval, so a gate job merges here. The one exception is a merge
`"pr"` Factory, where nothing commits to local `main`: there the same
`job.json` write and **Worktree check** are followed by **PR hand-off**
(`merge.md`) in place of **Merge**, never **Merge** itself, and the job
ends at `approved` for the Control Plane to push. A spike (`kind: "spike"`) never
runs **Merge**: delete `reason` from its `job.json`, as `/factory rework`
does, then run **Spike check** (`spikes.md`) for it, which goes on to the
**Spike Lens** and **Conclude**. When `job.json`'s `reviews` already holds
`spike` at `PASS` or `CHANGES`, the Lens has judged the current pass: skip
the **Spike Lens** and go straight to **Conclude**, since this command is
the human's approval. Decide this from `job.json` alone, never from the
review file, which an agent could have written. Otherwise the Lens runs,
and its verdict decides as usual.

**Worktree check.** Before spawning anything or running **Merge**,
`git worktree list --porcelain` must name `job.json`'s `worktree` in an
entry with no `prunable` line, and `test -d <worktree>` must succeed: git
still lists a worktree whose folder was deleted, marking it `prunable`.
When either fails, run `git worktree prune`, then recreate the worktree:
`git worktree add <worktree> factory/<job-id>` when the branch exists
(`git rev-parse --verify --quiet refs/heads/factory/<job-id>` prints a
commit), else `git worktree add -b factory/<job-id> <worktree> main`. Then,
inside it, run whatever AGENTS.md says a fresh checkout needs. On any
failure, set `stage: "needs-human"` and
`reason: "worktree setup failed: <first line of the failing command's output>"`
in one `job.json` write, then continue at **Needs human**. A spike's approve
and rework run this check too.

## /factory rework <job-id> <note>

Only for a job in `needs-human`, `cancelled`, `concluded` or `pr-opened`. A
spike reworks as **Spikes** in `spikes.md` says. A `pr-opened` job's pull
request stays open: the next APPROVE's push updates it.

1. Save the note word for word as `factory/jobs/<job-id>/rework-<k>.md`, where
   `k` is one more than the highest existing rework number, or 1 for the first.
2. This is a new orchestrating session, so read `pid`, `session_id` and
   `origin` afresh (see **job.json**). Set `stage: "build"`, those three
   fields, and `rounds["N+1"].startedAt` to now, where `N` is the job's last
   round, and delete `reason` so it can't leak into a later episode. If `pid`
   or `session_id` comes back empty, or the echo was refused, delete the old
   value instead of keeping it: a dead pid left over from the previous run
   would make the Control Plane think this live run had died.
3. Run the **Worktree check** (see **/factory approve**).
4. Spawn a new `builder` with
   `<paths> Rework: read rework-<k>.md and address it, then update build.md for round N+1. Port: <port>.`
   When `job.json`'s `reviews` still holds a core reviewer or blocking Lens
   at `CHANGES`, add ` Also address every finding in the round-<N>/ reviews from <key>, <key>.`
   naming each of them. When `job.json`'s `ci` is `FAIL`, add
   ` Also fix what round-<N>/ci.log reports.` Add ` Advisory Lenses, yours to take or leave: <key>, <key>.`
   with every advisory Lens's key when the policy has any. When the
   policy's `merge` is `"pr"`, add
   ` This Factory merges through pull requests: merge main into factory/<job-id> with git merge main, never rebase it, and resolve any conflict, so the next push fast-forwards the pull request.`
   Then overwrite `builder_agent_id` with the id the Agent tool returns. A
   rework starts with a fresh `MAX_RESUMES`.
5. Carry on from **Build check** as for any new job, so the new builder's
   pass goes through **CI check round N+1** when the policy has a `ci`.
