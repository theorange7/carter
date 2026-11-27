# Carter

Carter is a local, agent-assisted roadmap planning tool with optional GitLab
sharing and publication. This checkout contains specifications, a vendored factory kit and a
browser-only interaction prototype. The production application is not implemented.

Read these before changing product behavior:

- [Product specification](docs/specs/delivery-atlas-v0.1.md): governs behavior,
  data contracts, security boundaries and release acceptance.
- [Work breakdown](docs/delivery-atlas-work-breakdown.md): defines each delivery
  slice and its acceptance criteria.
- [Backlog](factory/backlog.md): records the queue and dependency order.

The existing Delivery Atlas document names and illustrative `atlas` CLI surface
remain source references. They do not mean that these commands are installed or
implemented. Do not rename contracts or settle the source documents' open
decisions as an incidental part of another slice.

## Current setup and checks

The [prototype guide](prototype/README.md) describes the working browser demo.
Its local assets live under `prototype/`; it has no runtime dependencies and no
model, MCP, service or Git/GitLab integration. From the repository root:

```sh
python3 -m http.server 5120 --bind 127.0.0.1 --directory prototype
node prototype/model.test.cjs
node --check prototype/model.js
node --check prototype/app.js
python3 prototype/bundle.py --output /tmp/carter-prototype.html
```

Open `http://127.0.0.1:5120/` or `prototype/index.html` directly. The bundle is a
single offline HTML demo. Node is needed only for development checks, not to run
the prototype. Real browser checks and captures must be recorded separately.

There is no production package manifest, pinned toolchain, production test runner,
lint/type-check runner or application development server. The prototype's browser
localStorage and deterministic simulation do not satisfy production release
criteria. Markdown-only work requires no dependency installation.

From the job worktree, check whitespace before committing:

```sh
git diff --check
```

After committing, check the complete branch and its scope:

```sh
git diff --check main...HEAD
git diff --name-only main...HEAD
```

Check that relative Markdown links resolve to tracked files or directories, and
compare changed guidance against the source documents it describes. Record
commands and results in the job's build report. Do not report nonexistent app
tests or disabled CI as passed.

DA01 owns introducing the installable Python package, pinned dependencies,
shared contracts, fixtures and runnable offline validation path. It must update
this file with verified fresh-checkout setup and development/test commands.
Later slices must keep the commands for their implemented areas current.

## Implementation boundaries

The proposed architecture is a Python core with shared application services and
a React/TypeScript viewer shared by local and static modes. These are planned
components, not existing source directories or delivered capabilities.

- Local planning and MCP operations must work offline without GitLab or model
  provider credentials. Validation is deterministic and never calls a model.
- The local workspace service owns the durable reply inbox and proposal store.
  The stdio MCP adapter uses that same service and state, not its own inbox.
  Processing the queue requires an explicit agent instruction; MCP does not
  wake an idle session. Waiting UI must describe that state honestly.
- Managed edits require a proposal, validation and explicit local human
  acceptance before application, with stale-hash checks and recoverable atomic
  updates. Direct edits remain labelled as direct edits.
- Sharing requires explicit authorization for the reviewed files and target.
  Queuing a reply does not authorize a push. The app does not merge GitLab MRs.
- Confine local paths to the selected repository, reject traversal and symlink
  escapes, secure the loopback service and render untrusted text safely.
- Provider credentials must never be read, logged, stored or forwarded by the
  application. Keep them out of state, browser output, exports and child-process
  environments. GitLab credentials stay server-side.
- Real-client and GitLab integration claims require real evidence. Record a
  missing client, credential or instance access as a blocker; mocks do not
  establish compatibility or successful publication. Never quote secret values.

See the product specification for full constraints and acceptance criteria.

## Factory

Follow the [factory skill](.claude/skills/factory/SKILL.md) and its referenced
procedures, [role definitions](.claude/agents/),
[backlog](factory/backlog.md), [policy](factory/policy.json) and
[security model](factory/SECURITY.md). The security model identifies guarded
files and escalation rules; do not weaken them to make a job pass.

Each job uses an isolated `factory/<job-id>` branch and a worktree beside the
main checkout at `../<repo>-factory/<job-id>/`. Builders change that worktree;
they leave the main checkout and other jobs alone. Runtime job state belongs
under the main checkout's ignored `factory/jobs/<job-id>/`. The orchestrator
maintains `job.json`; each agent writes only its assigned report and permitted
worktree files. Do not commit job state, inbox files or `factory/local.json`.

Feature jobs run spec-writer, builder, then the four core review roles
(security, UX, UI and code), plus policy-defined extra Lenses, before the
approver. Applicable validation evidence is required even when CI is disabled.
Use the skill's bounded rework and explicit blocked-state procedures.

The policy file is authoritative. It currently specifies `merge: "pr"`,
`ci: null` and no extra Lenses. After approval, PR hand-off commits the
changelog fragment and any accepted-risk ADRs on the job branch and leaves the
job at `approved`; it does not merge into `main`. A registered, running
Control Plane (`factory serve`) is required to push that branch and open its
pull request. A hand-run job waits at `approved` until one runs; the kit's
presence is not evidence that a Control Plane is installed or running.
A human merges the pull request on the forge. Backlog dependencies become
satisfied only when their required jobs have merged, as the skill defines.
