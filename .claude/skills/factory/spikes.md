# Factory: Spikes

Part of the factory skill, read from `SKILL.md`.

## Spikes

A spike is a job that answers a question instead of delivering a change. It
runs one build pass on its own branch, gets `findings.md` from the builder
instead of `build.md`, runs the `spike` Lens and no approver, and ends
`concluded` with its findings committed to `main` as
`docs/spikes/<job-id>.md`, under `merge: "pr"` through their own pull
request. It never runs the four core reviewers, UX and UI
included. Its branch never merges. Every command section points here for a
spike.

**Which jobs are spikes.**

- `/factory <feature>`, and so `/factory next`: the feature is a spike when
  its text, after an optional leading ID such as `[S1] ` (see **Line
  syntax** in `next.md`), starts with `spike: `, as in `spike: Can we stream
  the export?` or `[S1] spike: Can we stream the export? after: L2`.
- `/factory spec <inbox-file>`: the Spec is a spike when its first non-blank
  line after the frontmatter, or its first non-blank line when it has none,
  is exactly `Kind: spike`. That line anywhere else doesn't count.

A spike's first `job.json` has `"kind": "spike"` and `reviews: {}`, which
the **Spike Lens** fills, and every later write carries `kind`. `feature` is
the verbatim text, or the inbox title, as for any job.

**Spec.** `/factory <feature>` spawns `spec-writer` with
`<paths> Spike: <feature, verbatim>`. An inbox spike skips the spec-writer, as
any inbox Spec does.

**Build pass.** Set `stage: "build"`, `round` to the pass number (1 for the
first) and `rounds["<pass>"].startedAt` to now, then spawn `builder` with
`<paths> Spike, Build round <pass>. Write findings.md, not build.md. Port: <port>.`
Save the agent id the Agent tool returns as `builder_agent_id`. Never resume
that builder, and run no approver. When it returns, first set `reviews` to
`{}` in `job.json`, before anything else: the builder could have written a
verdict there, and `/factory approve` would trust one left in place if this
session died before the **Spike Lens**. Then continue at **Spike check**.

**Rework.** `/factory rework` (`lifecycle.md`) takes its steps 1 to 3 as
for any job, also setting `round` to N+1 and `reviews` to `{}`, so no
verdict carries over to the new pass. In place of its steps 4 and 5, spawn
a new `builder` with
`<paths> Spike rework: read rework-<k>.md and address it, then rewrite findings.md for round N+1, keeping its Log. Port: <port>.`
When the `reviews` you cleared held `spike` at `CHANGES`, add
` Also address every finding in round-<N>/review-spike.md.` Then overwrite
`builder_agent_id` with the id the Agent tool returns. When it returns, set
`reviews` to `{}` first, as after the build pass, then continue at **Spike
check**.

### Spike check

`factory/jobs/<job-id>/findings.md` must exist, and its first line must be
exactly `ANSWER: yes`, `ANSWER: no`, `ANSWER: partly` or
`ANSWER: inconclusive`. Otherwise set `stage: "needs-human"` with
`reason: "no findings.md with an ANSWER line"` and continue at **Needs
human**. Then run the **Spike Lens**.

The file may have been written by the kit's SubagentStop hook
(`factory/save-review.sh`) from the builder's returned findings, when the
builder returned without writing it; check it like any other. Never create
`findings.md` from a returned report yourself: never save or copy a
handback.

### Spike Lens

The kit's `spike` Lens reads `findings.md` before it reaches `main`. Let `N`
be the pass.

1. Create `factory/jobs/<job-id>/round-<N>/`, then update `job.json`:
   `stage: "review"`, `reviews: {"spike": "pending"}` and `rounds["N"].head`
   set to the branch tip, `git -C <worktree> rev-parse HEAD`. When
   `round-<N>/review-spike.md` already exists, Read it, then use the Write
   tool to empty it: the builder ran first and could have written a verdict
   there, and only the Lens's own may count.
2. Spawn `spike` with `<paths> Review round N.`, with no port.
3. When it returns, read the first line of `round-<N>/review-spike.md`,
   `VERDICT: PASS` or `VERDICT: CHANGES`, and record it in `job.json` under
   `spike`. The file may have been written by the kit's SubagentStop hook
   (`factory/save-review.sh`) from the Lens's returned report, when the Lens
   returned without writing it. Never create it from a returned report
   yourself: never save or copy a handback. A missing file sets
   `stage: "needs-human"` and
   `reason: "lens spike wrote no review in round <N>"` in one `job.json`
   write, then continues at **Needs human**, and a first line that isn't a
   verdict does the same with
   `reason: "lens spike wrote no verdict in round <N>"`.
4. Then decide:
   - **PASS**: run **Conclude**.
   - **CHANGES**: when the policy's `lenses` has an entry named `spike` with
     `blocking: false`, run **Conclude** all the same. Otherwise set
     `stage: "needs-human"` with
     `reason: "findings not committed: the spike Lens asked for changes in round-<N>/review-spike.md"`
     and continue at **Needs human**.

### Conclude

Concluding commits the findings, and only them, on `main` in the main
checkout. When the policy's `merge` is `"pr"`, follow **Conclude in a pull
request** below instead. Take these steps in order. A failed check sets
`stage: "needs-human"` with the `reason` it names, then continues at **Needs
human**, and nothing further runs.

1. `git branch --show-current` must print `main`. Otherwise the reason is
   `"findings not committed: the main checkout is not on main"`.
2. `git diff --cached --name-only` must print nothing. Otherwise the reason
   is `"findings not committed: other changes are staged in the main checkout"`.
3. Read `factory/jobs/<job-id>/findings.md` with the Read tool, and use the
   Write tool to write its exact content to `<repo>/docs/spikes/<job-id>.md`.
   When that file already exists, as after a rework, Read it first: the Write
   tool overwrites only a file this session has read.
4. Stage it:
   ```bash
   git add docs/spikes/<job-id>.md
   ```
   Then `git diff --cached --name-only` must print exactly
   `docs/spikes/<job-id>.md`. When it prints nothing, the content was
   unchanged: skip step 5. When it prints anything else, the reason is
   `"findings not committed: other changes are staged in the main checkout"`.
5. Commit it:
   ```bash
   git commit -m "Add the findings of spike <job-id>"
   ```
   On a failure the reason is `"findings not committed: <git's first line of output>"`.
6. Set `stage: "concluded"`.

There is no changelog line and no push, and the branch and worktree stay.

### Conclude in a pull request

Under `merge: "pr"` nothing commits to local `main`, so the findings travel
alone on their own branch, `factory/<job-id>-findings`, cut from `main` and
never from `factory/<job-id>`, which holds the prototype. The Control Plane
pushes that branch, opens its pull request and moves the spike to
`pr-opened`, and to `concluded` once the pull request merges. Let
`<findings>` be the worktree path `<worktree>-findings`. Take these steps in
order; a failed step sets `stage: "needs-human"` with the `reason`
`"findings not committed: <git's first line of output>"`, then continues at
**Needs human**, and nothing further runs.

1. Create the findings worktree: when
   `git rev-parse --verify --quiet refs/heads/factory/<job-id>-findings`
   prints a commit, as after a rework, run
   `git worktree add <findings> factory/<job-id>-findings`, so the new
   commit lands on top and the push stays a fast-forward; otherwise run
   `git worktree add -b factory/<job-id>-findings <findings> main`.
2. Read `factory/jobs/<job-id>/findings.md` with the Read tool, and use the
   Write tool to write its exact content to
   `<findings>/docs/spikes/<job-id>.md`, reading that file first when it
   exists.
3. Stage it, each command one Bash call as written, so it matches the
   kit's `git add` and `git commit` rules:
   ```bash
   cd <findings> && git add docs/spikes/<job-id>.md && git diff --cached --name-only
   ```
   When that prints nothing, the content was unchanged: skip the commit.
   Otherwise commit it alone:
   ```bash
   cd <findings> && git commit -m "Add the findings of spike <job-id>" -- docs/spikes/<job-id>.md
   ```
4. Remove the findings worktree with `git worktree remove <findings>`,
   keeping the branch.
5. Set `stage: "approved"` and end your turn: `approved` is no halt (see
   **Halts**). The Control Plane's push step accepts only
   `docs/spikes/<job-id>.md` on the branch since it left `main`.
