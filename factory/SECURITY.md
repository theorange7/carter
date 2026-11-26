# Security model of this Factory

> Kit text, verifiable against the files it names. The Control Plane that runs
> this Factory unattended has its own model in the kosf repo's
> `docs/SECURITY.md`
> (<https://github.com/theorange7/kosf/blob/main/docs/SECURITY.md>).
> The **This repo** section at the end is yours; the kit upgrade keeps it.

## Trust model

Levels, each meaning one thing:

- **Trusted**: can change the model.
- **Untrusted input**: text that steers agents; never trusted.
- **Guarded**: not sandboxed: auto mode plus kit rules plus the approver gate.

| Entity | Level | Rationale |
|---|---|---|
| Operator at the CLI; owner of `config.toml`, `secrets.env`, the registry | Trusted | Runs as and is the OS user |
| `kit_repo` `main` (the kosf repo) | Trusted **root** | Spawn and upgrade vendor its committed `kit/` into every Factory unreviewed; whoever commits there controls every Factory's permissions and gate agents. Mitigation, not yet in force: once the kosf repo's own `factory/SECURITY.md` lists `kit/` under **This repo**, its `kit/` files are guarded files and reach `main` only through a human; until then its approver escalates a `kit/` change only as a permissions change |
| Work submissions: `submit_feature`/`submit_spec`, `- [ ] ` backlog lines and `factory/inbox/*.md` from anyone who can commit to the target repo | Untrusted input, accepted | Starts a guarded Job with no confirmation. Accepted because on this host the only submitters are the operator and the operator's EM; a precondition, not a boundary |
| The target repo's own code | Trusted by registration | The builder runs its tests and dev server as the OS user; registering or spawning a repo is trusting its code to run as you. A precondition, not a boundary |
| Job documents, rework notes, Notification text | Untrusted input | Agent-written; never used to build a privileged summary, and relayed as text only; an injection surface toward the EM, not the Control Plane |
| Spike findings (`docs/spikes/*.md`) | Untrusted input | Agent-written text that the orchestrator commits to `main` when a spike ends `concluded`, with no approver or human gate; later spec-writers and builders read it as repo content. When the builder returns its findings without writing `findings.md`, the SubagentStop hook (`factory/save-review.sh`) saves them there from its handback, with a provenance line, and the `spike` Lens still reads that file before **Conclude**. Its one reviewer is the `spike` Lens (`.claude/agents/spike.md`), blocking unless the Factory's Guarded `factory/policy.json` has a `spike` entry with `"blocking": false`: it fails findings that hold a secret or feature work, or that would change anything on `main` but their own file. That Lens and the builder's rule against quoting secret values (`.claude/agents/builder.md` § Spikes) are prompts, not mechanical checks, and `/factory approve` on a parked spike commits the findings over the Lens's verdict on that pass, running the Lens first only when it has given none. That verdict is the one the orchestrator recorded in `job.json` after the Lens returned, never a review file found in place, since the builder runs first and could write one: the orchestrator sets `reviews` to `{}` as soon as the builder returns, and empties any `review-spike.md` before spawning the Lens. One window remains: a `reviews.spike` the builder writes into `job.json` itself survives an orchestrator that dies before it clears `reviews`, and `/factory approve` then skips the Lens. Under `"merge": "pr"` the orchestrator commits them instead on a findings branch, `factory/<job-id>-findings`, which the Control Plane opens as its own pull request and a human merges. |
| Fix-round delta reviews (`rounds[N].head` and `rounds[N].verdicts` in `job.json`) | Untrusted input | From review round 2, a Lens that passed the round before reviews only `git diff <head>..HEAD`, with `head` and its verdict taken from round N−1 in `job.json`, which the builder can write between rounds. The orchestrator gives that delta only for a `head` and verdict it wrote itself in the same session, only when `head` is 40 hex digits and `git merge-base --is-ancestor` finds it in the branch tip's history; otherwise, and after any resume, new session or `/factory rework`, the Lens reviews the whole branch. The approver always judges the whole branch, and **Merge** merges only the commit the Lenses reviewed. One window remains: the same-session rule is a prompt, not a mechanical check, and the 40-hex ancestor check alone doesn't stop a builder that moves `head` forward to one of its own commits, so an orchestrator that skips the comparison shows passed Lenses only the builder's later commits |
| Accepted-risk ADRs (`docs/adr/<NNNN>-<slug>.md` written at Merge) | Untrusted input | Agent-written text: at **Merge** the orchestrator copies the `## Accepted risks` entries of the approver's `decision.md` word for word into `docs/adr/` and commits them to `main`, after the approver's APPROVE or a human's `/factory approve`. No reviewer reads that text, since the approver writes it after the reviews, and under `"merge": "auto"` no human does either. Later security reviews and approvers treat a risk an ADR records as settled (`.claude/agents/reviewer-security.md`, `.claude/agents/approver.md`), and later agents read the ADR as repo content, so a recorded risk is not raised again until someone notices its `Revisit when:` trigger. The approver records only risks the branch introduces or widens. Under `"merge": "pr"` the orchestrator commits them instead on the Job's branch at **PR hand-off**, and they reach `main` only with its pull request, which a human merges. |
| Lens evidence (`factory/jobs/<id>/round-<N>/evidence/`) | Untrusted input | Agent-written screenshots, recordings and `index.md` from the UX and UI Lenses, which may show anything the page under test displayed, a secret included. Their cap of 12 files and 15 MB per Lens per round, their rule against capturing a secret or a `#token=` address, and their rule to write only inside the Job folder are prompts, not mechanical checks: the allow rule `Bash(agent-browser *)` lets agent-browser write a capture to any path. Nothing empties the folder before the Lenses run, so the builder, which runs first, could plant captures and an `index.md` that the dashboards label as a Lens's; no gate reads evidence, so this can mislead a human only. Both dashboards show the captures, and a Control Plane's run archive, when there is one, keeps them with no expiry |
| Orchestrator and its subagents | Guarded | Deny rules, narrow allow rules, the auto-mode classifier, prompts become denials; nothing OS-enforced |

## No container

A Job the Control Plane starts is a headless `claude -p` process running **as the
operator's OS user, in this repo's main checkout, with the operator's real
`HOME`**. There is no sandbox: it and every subagent can read any file that user
can, reach any network, and run this repo's tests and dev server.

It is launched with `--setting-sources project` and `--strict-mcp-config`, so
the operator's personal settings, skills and plugins don't reach it, no MCP
server does (not even a `.mcp.json` in this repo), and its settings turn auto
memory off. Its settings are this repo's
`.claude/settings.json` plus one `--settings` file the Control Plane writes for
each launch: the operator's Global layer `settings.json`, with this repo's
`factory/guardrails.json` merged in (denials only). The Global layer's plugin
adds its skills and agents as `fglobal:<name>`. The Control Plane may also
pass a per-launch `--agents` file, which redefines each agent whose model
`factory/policy.json`'s `models` or the operator's Global layer routes: the
agent's `.claude/agents/<name>.md` as committed on `main`, with only its
`model` changed. The Control Plane never writes `mcpServers` or `hooks` into
those definitions, since `--agents` definitions skip `--strict-mcp-config` and
the trust step: routing an agent whose frontmatter has either holds the
Factory instead. `.claude/settings.local.json` is not read by launched Jobs. The `--settings` file also denies `Read`, `Edit`
and `Write` on the Control Plane's own folders, `~/.config/kosf/**` and
`~/.local/state/kosf/**`. Those are permission rules for the file tools: a
Bash command reading or writing the same paths is judged only by the
classifier.

The `--settings` file of every launch and resume, and `.claude/settings.json`
as the kit ships it, also register one SubagentStop hook, the main
checkout's `factory/save-review.sh` (see **Permissions**). Claude Code runs a
hook itself whenever a subagent stops, outside the permission layer below:
no deny rule, allow rule or classifier check applies to it.

What stands between it and harm is Claude Code's permission layer, launched as
`--permission-mode auto --permission-prompts none` and never with
`bypassPermissions`, in this order:

1. **Deny rules** in `.claude/settings.json` and the `--settings` file are
   checked first and win over everything.
2. **Allow rules** let the loop's own commands run; a match skips the
   classifier.
3. **The auto-mode classifier** judges everything else.
4. **`--permission-prompts none`** turns anything that would have prompted into
   a denial the run survives.

It does not stop reads anywhere on the machine, it does not hide the
orchestrator's OAuth token from the commands it runs, and a text deny rule is
bypassed by other spellings of the same command (`/usr/bin/git`, `sh -c`,
`git -C`, quoting, variables). Claude Code's Bash sandbox is off, unless the
operator turns it on in the Global layer's `settings.json`.

Claude Code ignores this repo's `permissions.allow` until the workspace is
trusted: open Claude Code interactively in the repo once and accept the trust
dialog before autonomy is turned on. A headless session in an untrusted repo warns
and continues with the allow rules ignored.

## Permissions

Allow-rule matches, read-only actions and edits inside the working directory
skip the auto-mode classifier; everything else goes to it, and an action that
would need a prompt is denied instead. `.claude/settings.json` holds the kit's
baseline of 23 allow rules and 18 deny rules, and deny wins over allow. A
launched Job also gets the operator's Global layer and this repo's
`factory/guardrails.json`, merged into one `--settings` file (see **No
container**). `factory/guardrails.json` may hold only `permissions.deny`,
`permissions.ask`, `sandbox.filesystem.denyRead` and `denyWrite`,
`sandbox.network.deniedDomains` and `sandbox.credentials.envVars` deny
entries; anything else, or a `Read(/…)`, `Edit(/…)` or `Write(/…)` rule with a
single leading slash, holds the Factory's intake until it is fixed on `main`.

The allow rules let the routine factory commands pass: `agent-browser`, `cd`,
`echo`, `date -u`, the skill's own `mkdir`, `mv` and `test` calls on `factory/`
paths, the CI wrapper `factory/ci.sh`, and only the git subcommands the loop
runs (`status`, `log`, `diff`,
`rev-parse`, `merge-tree`, `branch --show-current`, `branch -d factory/*`,
`worktree add -b factory/*`, `worktree remove`, `add`, `add docs/spikes/*`,
`commit`, `merge --no-ff factory/*` and `merge --abort`). The skill's
**Merge** merges the reviewed commit, `git merge --no-ff <sha>`, which
`merge --no-ff factory/*` doesn't match, so it goes to the classifier, as do
`git -C <worktree> rev-parse HEAD`, the delta review's
`git -C <worktree> merge-base --is-ancestor`, the merge lock's command (a `mkdir` that
writes its `owner` file with `$(date …)` and a redirect), `rm -rf` and
`sleep`, and the worktree check's `test -d`, `git worktree list`,
`git worktree prune` and `git worktree add` without `-b`. The narrow
`add docs/spikes/*` stages a spike's findings, and still does in a Factory
that removed the broad `add`. `agent-browser *` also lets agent-browser write
a screenshot or recording to any path, with no classifier check: that the UX
and UI Lenses write theirs only to their Job folder's
`round-<N>/evidence/<key>/` is a prompt. `push`, `reset` and `config`
aren't allowed, so they go to the classifier. `cd *` and `echo *` are broad on
purpose: every agent runs its commands as `cd <worktree> && …` in a worktree
outside the workspace, and the skill reads its pid and session id with one
`echo`.

`factory/ci.sh *` lets the skill run the CI gate, which runs a shell command,
with no classifier check. The rule is narrow because the wrapper takes only a
job id and a round number: the command comes only from `factory/policy.json`
as committed on `main` (`git show refs/heads/main:factory/policy.json`),
never from the main checkout's working tree, the job branch or a tag named
`main`, and runs with `sh -c` in the job's worktree. The orchestrator
never reads CI output:
the wrapper prints only a PASS or FAIL line and writes the command's output
to `factory/jobs/<job-id>/round-<N>/ci.log`, which only the builder opens, as
untrusted input. The exposure has two routes to a shell command of an agent's
choosing, and neither reaches the classifier at any step:

- `cd *` plus `factory/ci.sh *` also matches `cd <worktree> && factory/ci.sh
  …`, which runs the job branch's copy of the script, one an agent on that
  branch can edit.
- Every Job agent's working directory is the main checkout, where edits skip
  the classifier. An agent can edit the main checkout's working-tree
  `factory/ci.sh` and then run `factory/ci.sh <job-id> <N>` through the allow
  rule. This works when the committed `ci` is `null` too, so it reaches every
  Factory with this kit, not only those that turn CI on. Editing the
  working-tree `factory/policy.json` changes nothing, since the wrapper reads
  committed `main`. But `git add *` and `git commit *` are allowed and the main
  checkout is on `main`, so an agent can commit a new `ci` there, which at
  least leaves a commit in `main`'s history. Both files are guarded, which only
  escalates a branch that changes them; it does nothing to stop an edit or a
  commit in the main checkout.

The CI command itself runs branch code unclassified too, by design, since
testing the branch is its job. Claude Code's Bash sandbox, off by default, is
the control that doesn't depend on a command's text.

The SubagentStop hook `factory/save-review.sh` runs with no permission check
at every subagent stop. When a Lens returns its report without writing
`round-<N>/review-<key>.md`, or a spike's builder returns its findings
without writing `findings.md`, it saves that file from the report, which is
what the agent's brief tells it to write there. It writes nothing else,
and only inside `factory/jobs/<id>/` folders that already exist and are not
symlinks; it takes the extra Lenses from `factory/policy.json` as committed
on `main`. The copy that runs is the main checkout's working-tree file,
which is `main`'s vendored copy: a job branch's copy never runs, and a
branch that changes it is escalated like any guarded file. But, as with
`factory/ci.sh`'s second route, every Job agent's working directory is the
main checkout, where edits skip the classifier, so an agent can edit the
main checkout's `factory/save-review.sh`. A hook runs outside the permission
layer and the classifier, so that edit runs unclassified at the next
subagent stop. Being guarded does nothing to stop it.

The deny rules take the riskiest spellings back out of those broad rules, in
five groups:

- `git log --output` and `git diff --output` (4 rules), which write files.
- `git commit --no-verify` and `-n` (4 rules), which skip the repo's hooks.
- `git commit --amend` (2 rules), which rewrites a reviewed commit.
- `git worktree remove --force` and `-f` (4 rules), which throw away a
  worktree's uncommitted work.
- `..` in the skill's `mkdir`, `mv`, `test -f` and `git add docs/spikes/*`
  path commands (4 rules), so they can't climb out of `factory/` or
  `docs/spikes/`.

Long flags are matched by their shortest unambiguous git prefix, in first
position and after other arguments. Deny rules are pattern matches and don't
catch every spelling, such as combined short flags like `-an`; the classifier
is the layer behind them. They also refuse a commit whose message contains
` -n` or ` --am`.

The baseline holds nothing repo-specific. Add this repo's own test, build, lint
and dev-server commands to `.claude/settings.json`, so the builder and reviewers
can run them unattended. `.claude/settings.local.json` (this machine only)
reaches hand-run sessions but not launched Jobs. The kit upgrade keeps them,
and always restores every kit deny rule.

## One worktree per Job, one gate

Each Job builds on its own `factory/<job-id>` branch in its own git worktree
next to the repo (`../<repo>-factory/<job-id>/`), so no Job edits the main
checkout or another Job's files. When `factory/policy.json` sets a `ci`
command, it must pass on the branch before any review starts; a spike never
runs it. Four reviewers
(security, UX, UI, code) read
the branch, with any extra Lenses `factory/policy.json` or the Global layer
names; from review round 2, one that passed the round before reads only
what changed since (see **Trust model**). When the four and every blocking
Lens pass, the approver decides, reading the whole branch.
Besides security bugs, the security reviewer blocks a branch that adds or
widens a silent merge, commit or skipped check, or a way for agent-written
content to reach `main` with no gate, and a branch that changes persisted
state or a schema without a note on migration, older kit contracts and what
a revert leaves behind. Under `"merge": "auto"`
APPROVE merges the branch into `main` with no human looking, and only the
commit the Lenses reviewed; a branch that moved since is refused. Under
`"merge": "gate"`, which a hand-run Job with no `factory/policy.json` also
gets, it stops the
Job at `needs-human` until a human runs `/factory approve <job-id>`. Under
`"merge": "pr"` it stops the Job at `approved`: the Control Plane pushes the
commit `job.json` names as reviewed, with only the changelog fragment and
ADR files after it, and opens a pull request that a human merges on GitHub;
nothing commits to local `main`. `job.json` is agent-writable, so a Job that
writes `approved` with its own tip as the reviewed head gets an unreviewed
branch pushed and opened as a pull request; the human merge is the gate. ESCALATE stops the Job at `needs-human` until
a human runs `/factory approve <job-id>` or `/factory rework <job-id> <note>`.
A spike runs only the `spike` Lens, which reads its findings, and no
approver, and its branch never merges: when it ends `concluded`, the
orchestrator commits only its findings file, `docs/spikes/<job-id>.md`, to
`main`, with no human gate, under `"merge": "auto"` and `"gate"`; under
`"pr"` on a findings branch, as its own pull request that a human merges.
Files: `.claude/skills/factory/SKILL.md`, `.claude/skills/factory/merge.md`,
`.claude/skills/factory/lifecycle.md`, `.claude/skills/factory/spikes.md`,
`.claude/agents/approver.md`,
`.claude/agents/reviewer-security.md`, `.claude/agents/spike.md`,
`factory/ci.sh`, `factory/save-review.sh`.

## Guarded files

A guarded file is one a Job may never merge on its own; the approver escalates it
to a human, whether or not this document was updated. The reviewer blocks a branch
that changes one and leaves a claim in this document false. A spike's
**Conclude** commits `docs/spikes/<job-id>.md` to `main` without consulting
this list, and **Merge** commits a decision's accepted risks as
`docs/adr/<NNNN>-<slug>.md` the same way, so a path under `docs/spikes/` or
`docs/adr/` can't be guarded.

| Guarded file | Why |
|---|---|
| `.claude/settings.json` | The permission layer |
| `.claude/agents/*` | The agents, the gate included |
| `.claude/skills/*` | The loop, and every skill later Jobs load |
| `factory/policy.json` | The Merge mode, CI command, Lenses and the agents' models |
| `factory/guardrails.json` | Extra denials merged into every launch |
| `factory/ci.sh` | Runs the CI command with no classifier check |
| `factory/save-review.sh` | Runs at every subagent stop with no permission check, and saves reviews and findings from agents' reports |
| `factory/SECURITY.md` | This document |
| The files under **This repo** below | This repo's own |

## What starts a Job

When autonomy is on, a `- [ ] ` line in `factory/backlog.md` or a file in
`factory/inbox/` starts a Job, with no confirmation: anyone who can commit to
`main` can start one. A backlog line that arrives in someone else's commit,
pulled or merged into the main checkout, starts an autonomous Job too, so review
`factory/backlog.md` and `factory/inbox/` like code. Under `"merge": "pr"`
the Control Plane pulls on its own: before every launch and after a pull
request merges, it fast-forwards the main checkout to the remote's `main`,
so whatever reaches the remote's `main`, backlog lines and every kit file
included, reaches the next launch with no local look.

## This repo

<!-- Yours. The kit never changes this section; the upgrade merge keeps it. -->

**Guarded files beyond the kit's:** _none listed yet._

**Security hot spots the reviewer should weigh:** _none listed yet._

**The approver always escalates:** _nothing beyond the kit's list yet._
