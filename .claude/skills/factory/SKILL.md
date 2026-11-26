---
name: factory
description: Orchestrates a factory job (spec, build, review by the four core Lenses and the policy's extra ones, approval, merge or a pull request's hand-off), or a spike, which answers a question in one build pass, is checked by the spike Lens and ends concluded with its findings committed. Invoke for /factory <feature>, /factory next, /factory spec <inbox-file>, /factory approve <job-id>, or /factory rework <job-id> <note> on a needs-human, cancelled, concluded or pr-opened job; the invoking session becomes that job's orchestrator.
---

# Factory

This session is now the orchestrator of one job. You do no engineering
yourself: no code, specs, reviews or decisions. Subagents do that work, each
writing a single file (the UX and UI Lenses also their evidence), and you
sequence them, keep the job's `job.json` true,
and at **Merge** (`merge.md`) copy the decision's changelog line into
`factory/CHANGELOG.md` and write its accepted risks as ADRs in `docs/adr/`,
or under `merge: "pr"`, at **PR hand-off** (`merge.md`), commit them on the
job's branch instead.
A spike, a job that answers a question instead of delivering a change, runs a
shorter loop and ends `concluded`, with you copying its findings to `main` at
**Conclude** (see **Spikes** in `spikes.md`).

Some sections live in reference files in this skill's folder, each named
where it is needed: Read the file then and follow it. For `/factory next`,
Read `next.md`. For `/factory spec <inbox-file>`, `/factory approve
<job-id>` and `/factory rework <job-id> <note>`, Read `lifecycle.md`.
**Merge** and **PR hand-off** are in `merge.md`. For a spike, Read `spikes.md`, which holds
**Spikes**, **Spike check**, **Spike Lens** and **Conclude**.

While the job runs, you alone write its `job.json`, with exceptions from the
Control Plane: its cancel sets `stage: "cancelled"`, and its reconcile, when
it finds the orchestrator dead, sets `stage: "needs-human"` plus a `reason`,
or for a usage limit a `reason` alone, which it removes when it resumes the
job (see `reason` in **job.json**). Under `merge: "pr"`, its push step moves
a job you left at `approved` to `pr-opened` once its pull request is open,
or to `needs-human` with a `reason`, and its PR tracking moves a
`pr-opened` job to `merged`, or a spike to `concluded`, once its pull
request merges.

## Shape of a job

```
spec-writer ──► builder ──► CI ──► reviewers ×4 + extra Lenses, in parallel ──► approver
                  ▲         │           │                                          │
                  │   a failing CI, or a blocking CHANGES (resumes left)           ├─ APPROVE  ─► merge into main (gate: needs-human; pr: approved)
                  └─────────┴───────────┘                                          └─ ESCALATE ─► needs-human
```

A spike is shorter, with one Lens, `spike`, and no approver (see **Spikes**
in `spikes.md`):

```
spec-writer ──► builder, one pass ──► findings.md ──► spike Lens ──► Conclude: commit them to main ─► concluded
```

Each step but CI is one subagent, named by its `subagent_type`, and each
writes one file in the job folder; the UX and UI Lenses also write their
evidence folder when they drove a page. CI runs only when the policy's `ci` is not
`null` (see **Policy**): you run `factory/ci.sh`, which writes the CI
command's output.

| Stage   | Agents                                                          | Output                                             |
| ------- | --------------------------------------------------------------- | -------------------------------------------------- |
| spec    | `spec-writer`                                                   | `spec.md`                                          |
| build   | `builder`                                                       | commits on `factory/<job-id>`, then `build.md`     |
| build   | CI: `factory/ci.sh`, run by you, no agent                       | `round-N/ci.log`                                   |
| review  | `reviewer-security`, `reviewer-ux`, `reviewer-ui`, `reviewer-code`, and each extra Lens's agent (see **Policy**); for a spike, `spike` alone | `round-N/review-<key>.md`, one per Lens, and `round-N/evidence/<key>/` from `reviewer-ux` and `reviewer-ui` when they drove a page |
| approve | `approver`                                                      | `decision.md`                                      |

**Halts.** Never end your turn while this job's `job.json` is at a
non-terminal stage (`spec`, `build`, `review` or `approve`), unless a
subagent you spawned is still running. Headless, ending the turn ends the
process, and the Control Plane can then only guess why the job stopped. So
every halt that would otherwise leave the job at a non-terminal stage first
sets `stage: "needs-human"` and a `reason` that names the cause, in one
`job.json` write, then continues at **Needs human**. A stop that no specific
reason in this skill covers uses `reason: "halted: <one line>"`, saying what
stopped you. The steps that already lead to **Needs human** (BLOCKED,
ESCALATE) already meet this rule: they keep their wording and add no
`reason`. `approved` is no halt: **PR hand-off** (`merge.md`) and a merge
`"pr"` spike's **Conclude** (`spikes.md`) end the turn there, handing the
job to the Control Plane. Merge's busy and failed stops write their own `reason` (see
**Merge** in `merge.md`). Stops that come before any `job.json` exists (a bad policy file,
a missing inbox file, no backlog line to claim), or that refuse a `/factory
approve` or `/factory rework` for the job's stage, are outside this rule.

`MAX_RESUMES = 2`. Round 1 is the builder's first pass; after it, the builder
may be resumed twice at most, so a run never exceeds three rounds, whether a
round ends at its CI check or at its reviews. A resume after a failed CI check
counts against `MAX_RESUMES` exactly like one after reviews.

These files hold nothing about any particular repo. Every agent learns setup,
the dev server, validation commands and conventions from the repo's
`AGENTS.md` (or `CLAUDE.md`). Changing how the factory works means editing this
skill and the agents in `.claude/agents/`.

## Running jobs side by side

A job gets its own branch and its own git worktree, so jobs never share a
working tree and several can run at once, one Claude session each. Each session
runs just one job: the one it created, or the one passed to it.

- You never leave the main checkout; the agents do their work inside the job's
  worktree. That checkout belongs to the user and is possibly dirty or on
  another branch, and nothing but **Merge** (`merge.md`) and a spike's
  **Conclude** (`spikes.md`) change it.
- State for a job is kept under `factory/jobs/<job-id>/` in the main checkout,
  never inside a worktree. Every job has its own `job.json`, so two sessions
  never write the same file.
- Ports and `agent-browser` sessions are per job too (see **Prompts**), so one
  job's reviewers never land on another job's pages.

### job.json

An example mid-way through round 2:

```json
{ "id": "012-export-csv", "feature": "Export the orders table as CSV",
  "branch": "factory/012-export-csv",
  "worktree": "/Users/you/code/shop-factory/012-export-csv",
  "stage": "review", "round": 2,
  "reviews": { "security": "PASS", "ux": "pending", "ui": "PASS", "code": "CHANGES",
               "fglobal-docs": "PASS" },
  "ci": "PASS",
  "pid": 50317, "session_id": "0d6b9a52-3e1f-4c7a-b8d4-91e2f6a0c35b",
  "origin": "manual",
  "builder_agent_id": "f9e8d7c6b5a4",
  "rounds": { "1": { "startedAt": "2026-11-02T14:10:00Z",
                     "head": "3f9c2a14d8e7b6a5f4e3d2c1b0a9f8e7d6c5b4a3",
                     "verdicts": { "security": "PASS", "ux": "CHANGES", "ui": "PASS",
                                   "code": "PASS", "fglobal-docs": "PASS" } },
              "2": { "startedAt": "2026-11-02T14:52:37Z",
                     "head": "9b41e07c3d2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e" } } }
```

Every write replaces the whole file and carries every field forward.

- **`stage`**: `spec`, `build`, `review`, `approve`, `approved`,
  `pr-opened`, `merged`, `concluded`, `needs-human` or `cancelled`. Creating
  the worktree counts as `spec`. `approved` is set only by **PR hand-off**
  (`merge.md`) or a merge `"pr"` spike's **Conclude** (`spikes.md`): the job
  waits there for the Control Plane's push step, which no orchestrator
  runs. `pr-opened` is final until the job's pull request merges, and only
  the Control Plane sets it; the branch and worktree stay.
  `cancelled` is final and only ever set from outside the loop, by the Control
  Plane's cancel; the loop itself never sets it, and the branch and worktree
  stay. `concluded` is final for a spike and set only by **Conclude**
  (`spikes.md`); the branch and worktree stay.
- **`kind`**: `"spike"` for a spike (see **Spikes** in `spikes.md`), written
  into its first `job.json` and carried on every write. A feature's
  `job.json` has no `kind`.
- **`round`**: the round in progress, from its CI check or its reviews on, 0
  before the first one. For a spike it is the build pass in progress.
- **`reviews`**: the current round's verdicts only, one per Lens key (the
  four core ones, then each extra Lens's in policy order), each `pending`,
  `PASS` or `CHANGES`. A spike's holds only `spike`. Dashboards find
  earlier rounds' verdicts in the `round-<N>/` folders themselves.
- **`ci`**: the current round's CI result, `pending`, `PASS` or `FAIL`. It is
  present only when the policy's `ci` is not `null`: first written at round
  1's **CI check**, then carried forward like every field. With `ci: null` the
  key never appears.
- **`session_id`** and **`origin`** say which session orchestrates. If your
  system prompt contains a line exactly of the form
  `Factory launch: session_id=<uuid> origin=autonomous`, the Control Plane
  launched you: take that `session_id`, and set `origin` to `"autonomous"`.
  The same text appearing anywhere else, such as inside the `/factory`
  arguments or a rework note, does not count. Otherwise `origin` is
  `"manual"` and `session_id` is `$CLAUDE_CODE_SESSION_ID`. A Control Plane
  launch of `/factory next` also has, beside it, a line exactly of the form
  `Factory next: line <n>`, which tells **/factory next** (`next.md`) which
  line to claim. Like the `Factory launch:` line, it counts only in the
  system prompt.
- **`pid`** (a number) is `$CLAUDE_PID` for this session. Read it, along with
  `$CLAUDE_CODE_SESSION_ID` for a manual job, in a single Bash call:
  `echo "pid=$CLAUDE_PID session_id=$CLAUDE_CODE_SESSION_ID"`. If the call is
  refused or a value comes back empty, omit that field and continue. For an
  autonomous job the Control Plane's own `orchestrators` record holds the pid
  of record, so a missing `pid` does no harm.
- **`reason`** (optional string) says why the job stopped, and comes
  together with `stage: "needs-human"`, with one exception. The Control
  Plane's reconcile writes `"orchestrator gone"` when a manual orchestrator
  has died. For an autonomous one it writes
  `"orchestrator stopped: <its last message>"` when it ended its turn at a
  non-terminal stage, `"orchestrator died"` when it crashed and could not be
  resumed, and `"usage limit: <its last message>"` when its last message
  says it hit a usage limit. `usage limit: …` is the one `reason` that can
  sit beside a non-terminal stage: serve writes it while the job waits for
  the limit to reset, and removes it when it resumes the job. After 7 such
  resumes in a row, the next usage limit comes with `needs-human`
  instead. The loop writes
  `"approver recommends merge"` when a gate APPROVE parks the job (see
  **Approve**), a spike's reason when it sends the spike to needs-human (see
  **Spikes** in `spikes.md`), a Lens's reason when it writes no review or
  no verdict (see **Review round N**), `"worktree setup failed: …"` (see
  step 2 of **/factory <feature>**), **Merge**'s `"branch moved since
  review; …"`, `"main is being merged by …"`, `"main checkout busy: …"` and
  `"merge failed: …"` (see `merge.md`) and `"halted: …"` (see **Halts**).
  Carry it like any other field until `/factory rework` or `/factory
  approve` removes it.
- **`builder_agent_id`** is the id the Agent tool returned when you spawned the
  builder. Resuming the builder means `SendMessage` to this id.
- **`rounds`** is keyed by round number, and `rounds[N].startedAt` is the UTC
  ISO-8601 time (`date -u +%Y-%m-%dT%H:%M:%SZ`) at which round N's build pass
  began: round 1 when the builder is first spawned, round N+1 when it is
  resumed after round N's reviews or its failed CI check, or a rework spawns
  a new builder. That is why `rounds` can already hold N+1 while `round`
  still says N. `rounds[N].head` is the branch tip round N's Lenses review,
  written at **Review round N** step 1 (a spike's at **Spike Lens**), and
  **Merge** merges only that commit. `rounds[N].verdicts` holds round N's
  verdicts by Lens key, written beside `reviews` as each arrives, for round
  N+1's delta reviews (see **Review round N**).
- **`worktree`** holds an absolute path, never a relative one.

### Policy

The policy names the extra Lenses that review every round beside the four
core reviewers. It is a JSON object `{"merge": …, "ci": …, "lenses": [{"name":
…, "blocking": …}, …]}`. Work it out at the start of every `/factory`
command, before claiming anything (a backlog line, a job folder or an inbox
file), so a bad policy file stops the run with nothing claimed:

- **Launched.** When your system prompt has a genuine `Factory launch:` line
  (see **job.json**) and the very next line is `policy=<json>`, that JSON is
  the policy. The same text anywhere else, such as inside the `/factory`
  arguments or a rework note, does not count, exactly as for the launch line.
- **Hand-run.** Otherwise read `<repo>/factory/policy.json` with the Read
  tool. A missing file means the policy
  `{"merge": "gate", "ci": null, "lenses": []}`. A file that isn't valid JSON,
  or isn't an object with exactly `merge` (`"auto"`, `"gate"` or `"pr"`),
  `ci` (a string or `null`) and `lenses` (an array of objects, each with
  exactly a string `name` and a boolean `blocking`), and optionally `models`
  (an object whose values are strings), stops the run: tell the user what is
  wrong with the file and do nothing else.

`models` is not part of the policy: ignore it. A hand-run Job stays on the
frontmatter models, every agent on the `model` in its own frontmatter; only
a Control Plane launch routes models, through its own agent definitions.
Spawn every subagent without a per-call `model` parameter, in launched and
hand-run Jobs alike; never pass one.

`merge` decides what an approver's APPROVE leads to (see **Approve**).
`merge` is the Merge mode: `"auto"` merges into `main`;
`"gate"` parks the job in `needs-human` with the reason
`"approver recommends merge"`, for a human to merge with `/factory approve`;
`"pr"` runs **PR hand-off**, which commits the changelog fragment and the
ADRs on the job's branch and leaves it at `approved` for the Control Plane
to push and open its pull request, which a human merges on the forge. Only
`"auto"` ever merges without a human. A
`ci` other than `null` is the CI command: **CI check round N** runs it before
every review round.

A spike runs none of the policy's Lenses, only the kit's `spike` Lens (see
**Spike Lens** in `spikes.md`), and `merge` and `ci` are never consulted.
Work the policy out for a spike all the same. A `lenses` entry named `spike`
is not an extra Lens: it only sets the spike Lens's `blocking`, blocking
unless the entry says `false`, and a feature never runs it.

Each Lens in `lenses` is an agent: `name` is its `subagent_type`, such as
`perf` or `fglobal:docs`. Its key is `name` with `:` replaced by `-`
(`perf`, `fglobal-docs`), and it writes `round-<N>/review-<key>.md`. A Lens
with `blocking: true` counts like a core reviewer; one with `blocking:
false` is advisory: the approver reads its review, but its CHANGES never
resumes the builder, and the builder may take or leave its findings.

### Prompts

The first sentence of every agent prompt gives absolute paths:
`Job folder: <repo>/factory/jobs/<job-id>/. Worktree: <worktree>. Branch: factory/<job-id>.`
Below, `<paths>` stands for that sentence. Use each prompt exactly as written
here: the Control Plane's token ledger reads the round numbers out of them.

Agents that open pages also get a port, added as ` Port: <port>.` Take
`portBase` from `<repo>/factory/local.json` in the main checkout, never from
the worktree: the file is gitignored, so worktrees lack it. Without the file
the base is 5100. Let `m` be the job number mod 100. Then the builder's port is
`base + 10m`, `reviewer-ux` gets `base + 10m + 1`, and `reviewer-ui` gets
`base + 10m + 2`. Job `047` on base 7100, for instance, gives m = 47 and ports
7570, 7571 and 7572. The same rule holds for the build, every review round and
a rework.

## /factory <feature>

1. **Create the job.** Run `mkdir -p factory/jobs`. The job number is the next
   3-digit number after the highest-numbered folder already in
   `factory/jobs/`, or `001` when there is none; the slug is 2–4 words of the
   feature in kebab case, giving an id such as `012-export-csv`. Claim it with
   `mkdir factory/jobs/<job-id>`, without `-p`; if that fails because another
   session got there first, take the next number and try again. Compute the
   worktree path from `<repo>` as
   `$(cd .. && pwd)/$(basename "$PWD")-factory/<job-id>`. Read `pid`,
   `session_id` and `origin` (see **job.json**), and write the first
   `job.json`: `round: 0`, `stage: "spec"`, every review `pending` (the four
   core keys and each extra Lens's key, from the policy you already worked
   out; see **Policy**), that `worktree`, and those three fields. A spike's
   first `job.json` has `"kind": "spike"` and `reviews: {}` instead (see
   **Spikes** in `spikes.md`).
2. **Worktree.** Branch from `main` into a new worktree:
   ```bash
   git worktree add -b factory/<job-id> <worktree> main
   ```
   Inside the worktree, run whatever AGENTS.md says a fresh checkout needs,
   such as installing dependencies. On any failure, set
   `stage: "needs-human"` and
   `reason: "worktree setup failed: <first line of the failing command's output>"`
   in one `job.json` write, then continue at **Needs human**.
3. **Spec.** Spawn `spec-writer` with `<paths> Feature: <feature, verbatim>`,
   or `<paths> Spike: <feature, verbatim>` for a spike. When it returns, make
   sure `spec.md` exists. When it doesn't, halt the job (see **Halts**) with
   `reason: "halted: spec-writer wrote no spec.md"`.
4. **Build.** A spike goes to its **Build pass** instead: Read `spikes.md`
   and follow it.
   Set `stage: "build"` and `rounds["1"].startedAt` to now, then spawn
   `builder` with `<paths> Build round 1. Port: <port>.` Save the agent
   id the Agent tool returns as `builder_agent_id`. When the builder returns,
   continue at **Build check**.

### Build check

Look at the first line of `build.md`:

- `STATUS: READY` means the next round, N, starts: at **CI check round N**
  when the policy's `ci` is not `null`, otherwise straight at **Review round
  N**.
- `STATUS: BLOCKED` means **Needs human**.
- Any other first line: halt the job (see **Halts**) with
  `reason: "halted: build.md starts with neither STATUS: READY nor STATUS: BLOCKED"`.

### CI check round N

This runs only when the policy's `ci` is not `null`. With `ci: null` it never
runs, and nothing in `job.json` changes: it never gets a `ci` key.

1. Create `factory/jobs/<job-id>/round-<N>/`, then update `job.json`:
   `round: N`, `stage: "build"`, every review, the four core keys and each
   extra Lens's key, back to `pending`, and `ci: "pending"`.
2. From the main checkout, run exactly
   ```bash
   factory/ci.sh <job-id> <N>
   ```
   with no `cd`, no path prefix and no redirection, and with the Bash tool's
   maximum timeout of 600000 ms. The wrapper reads the CI command from
   `factory/policy.json` as committed on `main`, never the working tree's or
   the job branch's, runs it in the job's worktree, and writes its output to
   `round-<N>/ci.log`. It prints only one line: `ci: PASS`,
   `ci: FAIL (exit <code>); log: …`, or a `ci.sh: <problem>` line on stderr.
   A hand-run job takes its policy, and so whether this step runs, from the
   working tree, but the wrapper still runs committed `main`'s command; a
   committed `null` prints `ci: null …` and exits 0.
3. Act on the exit code. You never open, read or edit `ci.log`, in any of
   these cases: it holds the branch's output, and only the builder reads it.
   - **Exit 0**: set `ci: "PASS"` and continue at **Review round N**.
   - **Exit 1, or a call that times out**: set `ci: "FAIL"`, then:
     - **A resume left**: set `stage: "build"` and `rounds["N+1"].startedAt`
       to now, and `SendMessage` the builder at `builder_agent_id`. After
       exit 1 the message is exactly
       `Round N CI failed; its output is in factory/jobs/<job-id>/round-<N>/ci.log. Fix what it reports, commit, and update build.md for round N+1.`
       and after a timeout it is exactly
       `Round N CI timed out after 10 minutes; its output so far is in factory/jobs/<job-id>/round-<N>/ci.log. Make it finish within 10 minutes and pass, commit, and update build.md for round N+1.`
       When it returns, continue at **Build check**.
     - **No resumes left**: write `decision.md` yourself, consisting of
       `ESCALATE`, an empty line, and
       `CI failed in round N with no resumes left. Its output is in round-<N>/ci.log.`
       Then continue at **Needs human**.
   - **Exit 2**: the command never ran. Write `decision.md` yourself,
     consisting of `ESCALATE`, an empty line, and
     `CI could not run in round N: <the wrapper's stderr line>`. Then
     continue at **Needs human**. Do not resume the builder.

### Review round N

1. Create `factory/jobs/<job-id>/round-<N>/`, then update `job.json`:
   `round: N`, `stage: "review"`, every review, the four core keys and
   each extra Lens's key, back to `pending`, and `rounds["N"].head` set to
   the branch tip, `git -C <worktree> rev-parse HEAD`.
2. Spawn the four reviewers and every extra Lens **in a single message** so
   they run in parallel. Each reviewer's prompt is `<paths> Review round N.`,
   with the port appended for `reviewer-ux` and `reviewer-ui`. Each extra
   Lens is spawned with its `name` as `subagent_type` and the prompt
   `<paths> Review round N. Write your review to round-<N>/review-<key>.md; its first line is VERDICT: PASS or VERDICT: CHANGES.`,
   with no port. When N > 1, a Lens whose verdict in
   `rounds["N−1"].verdicts` is `PASS` gets a delta review: its prompt's
   `<paths> Review round N.` becomes
   `<paths> Review round N. You passed round <N−1> at <rounds[N−1].head>; review only what git diff <rounds[N−1].head>..HEAD changed.`,
   followed by the port for `reviewer-ux` and `reviewer-ui`, and by the
   `Write your review to …` sentence for an extra Lens, but only when this
   session wrote that `head` and verdict, `head` is 40 hex digits, and
   `git -C <worktree> merge-base --is-ancestor <head> HEAD` succeeds: the
   builder can rewrite `job.json`. Every other Lens gets the full prompt:
   one with `CHANGES` in round N−1, one new to this round, every Lens in
   round 1, and every Lens in the first review round after a
   `/factory rework`.
3. **Wait for all of them.** As each Lens returns, read the first line of
   its file, `VERDICT: PASS` or `VERDICT: CHANGES`, and record it in
   `job.json` under its key in `reviews` and in `rounds["N"].verdicts`, in
   one write at once, so dashboards show verdicts as they arrive. The round
   is over only when every Lens's `review-<key>.md` is in `round-<N>/`;
   never resume the builder before then. The file may have been written by
   the kit's SubagentStop hook (`factory/save-review.sh`) from the Lens's
   returned report, when the Lens returned without writing it; read it like
   any other. Never create a review file from a returned report yourself:
   never save or copy a handback. When a Lens, core
   or extra, returns with no file, set `stage: "needs-human"` and
   `reason: "lens <key> wrote no review in round <N>"`, such as
   `lens ui wrote no review in round 3`, in one `job.json` write, then
   continue at **Needs human**. When its file's first line isn't a verdict,
   do the same with `reason: "lens <key> wrote no verdict in round <N>"`.
4. Then decide. The four core reviewers and the blocking Lenses decide the
   round; an advisory Lens's verdict never does:
   - **All of them PASS**: go to **Approve**, whatever the advisory Lenses
     said.
   - **Any of them CHANGES, and a resume left**: set `stage: "build"` and
     `rounds["N+1"].startedAt` to now, and `SendMessage` the builder at
     `builder_agent_id`:
     `Round N reviews are in factory/jobs/<job-id>/round-<N>/. Address every finding in the reviews from <key>, <key>, commit, and update build.md for round N+1.`
     naming each core reviewer and blocking Lens with CHANGES, and adding
     ` Advisory Lenses, yours to take or leave: <key>, <key>.` with every
     advisory Lens's key when the policy has any. When it returns, continue
     at **Build check**.
   - **Any of them CHANGES, and no resumes left**: write `decision.md`
     yourself, consisting of `ESCALATE`, an empty line, and
     `Review rounds exhausted. Outstanding CHANGES in round-<N>/ from: <reviewers>.`,
     listing only the core and blocking Lenses with CHANGES. Then continue
     at **Needs human**.

### Approve

Set `stage: "approve"` and spawn `approver` with `<paths> Final round: N.`,
adding ` Advisory Lenses: <key>, <key>.` with every advisory Lens's key when
the policy has any. When it returns, the first line of `decision.md`
decides:

- `APPROVE` is decided by the policy's `merge`:
  - `merge: "auto"` leads to **Merge**: Read `merge.md` and follow it;
  - `merge: "gate"`: set `stage: "needs-human"` and
    `reason: "approver recommends merge"` in one `job.json` write, then
    continue at **Needs human**. Nothing is merged, and the branch and
    worktree stay for `/factory approve <job-id>`;
  - `merge: "pr"` leads to **PR hand-off**: Read `merge.md` and follow it.
    Nothing is merged, and the job ends your turn at `approved`.
- `ESCALATE` leads to **Needs human**.

### Needs human

Record `stage: "needs-human"`, keeping any `reason` already set and adding
none of its own, and leave the branch and worktree in place for the human.
Tell the user which job is waiting and where its worktree is, and quote
`decision.md`, or the BLOCKED reason from `build.md`, or the job's `reason`.

## Reporting

Give the user one short line at every transition, for example
`012-export-csv: round 2, code CHANGES, security/ux/ui PASS → resuming builder`.
When the job finishes, say whether it merged, concluded, was handed to the
Control Plane at `approved` or is waiting for a human, and why.

## Files

`<repo>` means the main checkout (`git rev-parse --show-toplevel` from this
session) and `<name>` its folder name. `factory/jobs/`, `factory/inbox/` and
`factory/local.json` are gitignored runtime state and never get committed.

| Path                                                    | What it is                                         |
| ------------------------------------------------------- | -------------------------------------------------- |
| `<repo>/factory/backlog.md`                             | the queue `/factory next` reads                    |
| `<repo>/factory/CHANGELOG.md`                           | one dated line per merged job, appended at Merge   |
| `factory/changelog.d/<job-id>.md` on `factory/<job-id>` | under `merge: "pr"`, the job's dated changelog line, committed at **PR hand-off**; the changelog is `CHANGELOG.md` followed by these fragments in date order |
| `<repo>/docs/adr/<NNNN>-<slug>.md`                      | one per accepted risk in the decision, written at Merge |
| `<repo>/factory/inbox/<slug>.md`                        | finished Specs waiting for `/factory spec`         |
| `<repo>/factory/local.json`                             | this machine's port base (see **Prompts**)         |
| `<repo>/factory/jobs/<job-id>/job.json`                 | job state: you write it, dashboards read it        |
| `<repo>/factory/jobs/.merge.lock/`                      | the merge lock, held during **Merge** (`merge.md`); its `owner` file holds `<job-id> <UTC time>` |
| `<repo>/factory/jobs/<job-id>/spec.md`                  | from spec-writer, or moved in from the inbox       |
| `<repo>/factory/jobs/<job-id>/build.md`                 | from the builder                                   |
| `<repo>/factory/jobs/<job-id>/findings.md`              | from the builder, for a spike, in place of `build.md` |
| `<repo>/factory/jobs/<job-id>/rework-<k>.md`            | a human's note, which you save at `/factory rework` |
| `<repo>/factory/jobs/<job-id>/pr-comments-<k>.md`       | under `merge: "pr"`, the forge's review comments, written by the Control Plane at a `pr-opened` rework that its note points to |
| `<repo>/factory/jobs/<job-id>/round-<N>/review-<key>.md` | one per Lens per round: `security`, `ux`, `ui`, `code` and each extra Lens's key, or `spike` for a spike |
| `<repo>/factory/jobs/<job-id>/round-<N>/evidence/<key>/` | the UX and UI Lenses' captures and `index.md` for round N, only when the Lens drove a page |
| `<repo>/factory/jobs/<job-id>/round-<N>/ci.log`         | the CI command's output for round N, from `factory/ci.sh` |
| `<repo>/factory/policy.json`                            | the policy a hand-run job reads (see **Policy**)   |
| `<repo>/factory/jobs/<job-id>/decision.md`              | from the approver, or from you when rounds run out or CI can't run |
| `<repo>/../<name>-factory/<job-id>/`                    | the job's worktree, on branch `factory/<job-id>`   |
| `<repo>/docs/spikes/<job-id>.md`                        | a spike's findings, committed on `main` at **Conclude** (`spikes.md`), or under `merge: "pr"` on `factory/<job-id>-findings` |

An inbox Spec has the same shape spec-writer produces, optionally preceded by
YAML frontmatter with a `title:` line. That frontmatter may also carry an
`id: <ID>` line, which names the Spec the way a line's ID names a line, and
an `after: <ref>, <ref>…` line, the Spec's own references (see
**/factory next** in `next.md`). serve launches such a Spec only once its
references are satisfied.
