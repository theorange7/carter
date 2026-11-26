# Delivery Atlas — product and implementation specification

Version: 0.1 · Draft for review · 27 November 2026

Delivery Atlas is a local, agent-assisted roadmap planning tool with optional publication through GitLab. Teams maintain delivery plans as versioned files in one consolidated repository. A localhost interface displays those files and lets users select roadmap items and attach instructions for an existing Codex or Claude session. A bundled MCP server exposes the planning operations. Teams share proposals through merge requests; merging to the default branch triggers validation and publication of the consolidated static roadmap.

Delivery Atlas is a working name. All roadmap examples in this document are illustrative.

## 1. Product boundaries

The repository is the source of truth for the agreed delivery plan. Local files and scenario branches contain proposals. The published site represents the latest successfully deployed default-branch snapshot, which may temporarily lag the repository if publication fails.

This is a roadmap tool for outcomes, delivery windows, milestones, ownership, dependencies and planning assumptions. Jira remains the team's task tracking system. Delivery Atlas has no Jira integration, ingestion, polling or background synchronisation. A Jira URL may be included as an ordinary reference link; the tool never retrieves its contents.

The agent helps interpret instructions and suggest changes. Deterministic code validates the resulting plan. The tool does not calculate capacity, optimise schedules, automatically propagate dates, or certify that a delivery plan is feasible.

Publication is optional. The complete local planning and MCP workflow works without GitLab credentials or network access. GitLab is required only for remote sharing, merge requests, CI and publication.

## 2. First-release scope

| Included at launch | Deferred |
| --- | --- |
| Multiple teams, each with multiple tracks | Jira or other external data integrations |
| Consolidated timeline and equivalent list view | Task boards, sprints and ticket tracking |
| Select an item and reply with attached context | Hosted agent runtimes and Slack bots |
| Local reply queue and bundled MCP server | Autonomous dispatch to idle agent sessions |
| Branch-based scenarios and comparison to a baseline | Capacity modelling and schedule optimisation |
| Shared Python validation, CLI and static export | Automatic cascade rescheduling |
| GitLab branch push and MR creation | Dedicated hosted preview URL for each MR |
| MR validation reports and downloadable site bundle | Persisted organisation-wide discussion system |
| Default-branch publication through GitLab Pages | Separate per-team deployments |

Embedded contextual replies are included. An embedded agent runtime, provider API credentials and a general-purpose chat application are not required. Delivery Atlas never calls a model: it works identically whether the agent client is authenticated with a provider API key or a subscription login (§7.4).

## 3. People, ownership and repository structure

A team owns its planning files. A track groups a team's related outcomes and milestones. A milestone has one accountable team and one accountable owner; contributing teams can be referenced without duplicating it in their files. Cross-team dependencies refer to the original milestone ID.

A reader uses the consolidated published site. A planner explores and edits locally with an agent. A reviewer assesses the MR and its generated artifacts. GitLab permissions and repository ownership rules govern approval and merge rights; Delivery Atlas does not introduce its own identity system.

Proposed layout for the consolidated planning repository:

```text
roadmap-repo/
  roadmap.yaml                 # schema version and shared policies
  teams/
    team-alpha/
      team.yaml                # team identity, name and owner
      tracks/
        onboarding.yaml
        reporting.yaml
        billing.yaml
    team-beta/
      team.yaml
      tracks/
        infrastructure.yaml
  .gitlab-ci.yml
  CODEOWNERS
  .gitignore
  README.md
```

The installable tool contains the Python core, CLI, local service, MCP adapter, viewer assets, schema and GitLab CI template. The planning repository pins the tool version so local checks and CI use the same rules and exporter. Tool source may live in a separate software repository; each team does not maintain a separate copy.

Tracks are discovered from files, avoiding a second manually maintained list. IDs are immutable and globally unique within their entity type. Display names and file locations may change without breaking references. Ownership rules must be configured and tested against the actual GitLab instance; a CODEOWNERS file alone is not a guarantee of enforced approvals.

## 4. Frontend and visual design

### 4.1 Visual direction

Use a restrained warm dark theme. Initial tokens are warm charcoal `#242220` for the canvas, warm taupe `#36312D` for panels and muted amber `#C49A62` for the single accent family. Off-white and muted neutral text provide readable hierarchy. Borders and timeline bars use neutral shades.

The previous 70/25/5 ratio is provisional: the user indicated a desire to revise it before specifying a replacement. Preserve sparse accents without treating that ratio as an approved requirement. Amber identifies selected context and the principal action. Status, commitment and validation severity use explicit labels, icons and line treatments rather than extra colour families. Contrast and focus visibility must be checked in implementation; the illustrative palette is not evidence of accessibility compliance.

### 4.2 Views

| View | Primary content | Actions |
| --- | --- | --- |
| Shared roadmap | Teams and tracks grouped into timeline lanes; dependency links; team, track and time filters | Inspect milestone, filter, switch to list |
| Local workspace | Current branch, unpublished state, selected items, contextual replies and validation findings | Queue reply, compare, validate, review changes |
| Scenario comparison | Milestones added, removed or changed; before/after dates; affected dependencies | Keep local, inspect diff, prepare MR |
| Review and share | Exact changed files, validation result, MR title, description and reviewers | Commit, push branch and open MR |
| Published site | Consolidated read-only roadmap and snapshot provenance | Browse and inspect only |

The timeline supports horizontal time navigation and track expansion/collapse. The list exposes the same information without requiring timeline navigation. Target and committed milestones use distinct labelled treatments. Undated milestones appear in an explicit unscheduled section rather than receiving invented dates.

Selection opens a contextual side panel and a small “Reply to this” action. Users can select one milestone, a track or multiple milestones. Each attached item appears as a removable reference chip. Selecting two milestones does not imply dependency direction: the instruction or a clarification must establish it.

The side panel contains the selected item's details, replies, agent response, proposed change summary and follow-up composer. Each proposal states which files and items changed. Baseline outlines and proposed bars distinguish dates without introducing another accent colour. Published pages contain no agent connection, composer or publishing controls.

All selection and reply actions must be keyboard accessible. Focus remains visible, and validation findings link to the relevant item and field. Default to a desktop layout; on narrow screens, stack the details panel and provide the list view.

## 5. Roadmap data contract

Use YAML as the canonical authored format and generated JSON as the viewer format. Dates are ISO calendar dates, with no implicit timezone or inferred working-day calendar. Generated timestamps use UTC. Unknown dates are represented by a missing window, not fabricated estimates.

| Entity | Required fields | Optional fields |
| --- | --- | --- |
| Repository | `schema_version`, `default_branch` | `review_interval_days` (proposed default 30) |
| Team | `id`, `name`, `owner` | description |
| Track | `id`, `team_id`, `name`, `owner`, `outcomes`, `milestones` | description, review metadata, assumptions, open decisions |
| Outcome | `id`, `title` | description |
| Milestone | `id`, `title`, `owner`, `outcome_id`, `commitment`, `status` | window, dependencies, contributors, confidence, notes, references |
| Dependency | `milestone_id`, `type` | note |

`commitment`: `target` or `committed`. `status`: `planned`, `in_progress`, `blocked`, `done` or `cancelled`. Optional `confidence`: `low`, `medium` or `high`, always accompanied by an explanation if supplied. Review metadata is either absent or a complete pair of `last_reviewed` and `reviewed_by`.

Example track:

```yaml
schema_version: 1
id: team-alpha.onboarding
team_id: team-alpha
name: Onboarding
owner: delivery-lead
last_reviewed: '2026-11-27'
reviewed_by: delivery-lead
assumptions:
  - Pilot participants are confirmed before each rollout stage.
open_decisions:
  - Confirm support handover timing.
outcomes:
  - id: team-alpha.onboarding.readiness
    title: Establish a repeatable onboarding approach
milestones:
  - id: team-alpha.onboarding.pilot
    title: Pilot rollout
    owner: onboarding-lead
    outcome_id: team-alpha.onboarding.readiness
    commitment: target
    status: planned
    window:
      start: '2027-01-04'
      end: '2027-01-29'
  - id: team-alpha.onboarding.stabilisation
    title: Stabilisation
    owner: onboarding-lead
    outcome_id: team-alpha.onboarding.readiness
    commitment: target
    status: planned
    window:
      start: '2027-02-01'
      end: '2027-02-26'
    dependencies:
      - milestone_id: team-alpha.onboarding.pilot
        type: finish_to_start
```

A window requires both start and end; a point milestone uses the same date for both. A committed milestone requires a window. Target milestones may be unscheduled. In v1, dependency types are `finish_to_start` (hard ordering) and `related_to` (informational). A finish-to-start dependency requires the successor start date to be later than its predecessor end date, using inclusive calendar-day windows. More complex scheduling relationships are deferred.

Outcomes referenced by a milestone belong to its track. Contributors reference known team IDs. References are optional labelled HTTP(S) links and are never fetched. Stable IDs, rather than titles, anchor dependencies and replies.

## 6. Local workflow and scenarios

1. Clone or open the consolidated repository and install the pinned tool.
2. Start the local workspace and configure the existing agent client with the bundled MCP server.
3. Browse the current files. Create a named scenario branch before the first agent edit if currently on the protected baseline branch.
4. Select one or more items and queue a contextual instruction.
5. Ask the connected agent session to process pending roadmap replies. It reads the queue through MCP, interprets the instruction and produces a proposal.
6. Inspect the proposed diff and validation result. Apply or reject it locally, then continue refining.
7. Review the complete branch diff against the current target branch. Explicitly choose to commit, push and open an MR when ready to share.
8. Reviewers use the MR, validation report and generated site artifact. Merge triggers consolidated publication.

A scenario is an ordinary Git branch. One checkout shows one scenario at a time; users who need simultaneous scenarios may use separate worktrees. No custom scenario database or branch-per-team requirement is introduced.

Display the scenario's base commit and current target-branch comparison. If the target branch advances, identify that the comparison is stale. Fetching updates is explicit. Never stash, discard, rebase or resolve conflicting edits silently. Existing dirty files require inspection before branch changes or tool-managed edits.

The viewer watches local files and refreshes the rendered preview. Invalid intermediate edits display diagnostics and preserve a clearly labelled last valid rendering; the UI must not present stale content as current.

## 7. Contextual replies and agent integration

### 7.1 Important execution constraint

MCP exposes operations to an agent client; it does not, on its own, start a model turn or wake an idle Codex/Claude session. V1 uses a durable local inbox and an explicit agent instruction such as “Process the pending roadmap replies.” No hosted runtime or continuous polling agent is assumed. The UI says “Queue for agent,” and shows “Waiting for agent” until a client claims the reply. Optional automatic dispatch requires a separately tested client integration and is deferred.

### 7.2 Reply envelope and lifecycle

Each reply records a unique request ID, repository identity, worktree identity, branch and base commit, selected entity IDs, selected content hashes, user message, timestamp and a user-approved context snapshot. Replies persist in a Git-ignored `.delivery-atlas/` directory and survive a local service restart. They are scoped to a checkout; unrelated scenario queues are not mixed.

Lifecycle: `queued → claimed → proposed → applied` or `rejected`; `failed`, `cancelled` and `needs_clarification` are explicit recoverable states. Claims use a lease and agent session ID so two clients do not process the same reply concurrently. Stdio MCP gives the server no client session identity, so the adapter generates one session ID per process and records the client name and version reported at `initialize` alongside it. Repeating an operation with the same request ID must not duplicate changes.

If an entity is renamed, its stable ID retains context. If an entity is deleted or the branch/content changes after selection, mark the reply stale and require a fresh read before proposing or applying changes. Do not silently attach a reply to another item. Replies and conversational history remain local; MR descriptions include the selected rationale and structured change summary, not the full conversation by default.

### 7.3 Proposed MCP tools

| Tool | Contract |
| --- | --- |
| `workspace_status` | Return repository, worktree, branch, baseline, dirty files and service status |
| `list_tracks` / `read_items` | Discover tracks and read items by stable ID |
| `list_replies` / `claim_reply` | Read the queue and claim a reply with a lease |
| `request_clarification` | Record an unresolved question in the local panel |
| `propose_changes` | Prepare structured edits with expected content hashes, rationale and affected IDs; return a preview diff |
| `validate` | Validate the complete proposed repository snapshot |
| `apply_proposal` | Apply a locally accepted proposal after rechecking expected hashes |
| `complete_reply` | Attach response, proposal ID and structured result to the reply |
| `compare_scenario` | Return semantic and file diffs against an explicit baseline |
| `create_scenario` | Create a branch after checking working-tree state |
| `prepare_merge_request` | Validate and return exact files, diff, title, description and affected teams |
| `submit_merge_request` | Commit reviewed files, push and create/reuse the MR following explicit user action |

Tool responses are structured and include IDs, revision hashes and actionable errors. The Python CLI calls the same application services. Pin an MCP SDK and supported protocol version during implementation, then test against the selected Codex and Claude clients. Use stdio for the bundled MCP adapter; it connects to the same local workspace service and inbox rather than creating independent state.

The adapter exposes tools only. It does not use MCP sampling or elicitation, which would depend on the client's model access and are not uniformly supported; `request_clarification` remains an ordinary tool. It negotiates the protocol version down to what each pinned client speaks rather than requiring the newest revision.

Adapter behaviour must hold within both clients' limits: stdout carries protocol messages only and all logging goes to stderr; startup completes well inside the clients' server start timeout; `read_items` and `compare_scenario` bound or paginate their output; `submit_merge_request` returns within the clients' tool timeout or reports progress through a pollable status. If the local service is not running, `atlas mcp` returns an actionable error naming `atlas serve` rather than creating independent state or hanging.

Client setup is a delivered feature, not a manual step: `atlas mcp install --client claude|codex` registers the adapter through each client's own mechanism (`claude mcp add`, `codex mcp add`) or prints the equivalent configuration, and never writes credentials into client configuration.

The managed workflow proposes changes before applying them. Users may still edit files directly with their editor or agent; such changes are labelled as direct working-tree edits and receive the same validation and comparison. They cannot be represented as tool-approved proposals retroactively.

### 7.4 Client authentication and supported surfaces

Supported clients in v1 are the Claude Code CLI and the Codex CLI, at versions pinned and recorded during verification. Hosted surfaces that cannot spawn a local stdio process (claude.ai web, Codex cloud) are out of scope.

Each client must work in both of its authentication modes: provider API key and subscription login. API-key mode is the priority: it is verified first and is the mode exercised by repeatable headless tests (`claude -p`, `codex exec`). Subscription mode requires an interactive login and is verified with human-assisted evidence. Verification records which mode was actually active for each run, since an API key present in the environment can take precedence over a login.

Authentication belongs to the client. Delivery Atlas neither requires nor inspects it:

- The adapter and service never read, log, persist or forward provider credentials such as `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or client token files. They do not appear in reply envelopes, context snapshots, proposal logs, MR descriptions or exported payloads, and are removed from the environment of Git and other child processes Atlas starts.
- Nothing in Atlas depends on environment variables reaching the adapter subprocess: clients differ in which variables they pass to MCP servers. The adapter needs only `--workspace`; it authenticates to the local service with a per-session token read from an owner-only (0600) file under `.delivery-atlas/`.
- GitLab operations run in the local service process, never in the adapter, so GitLab credentials do not depend on how the agent client was launched or authenticated (§9.1).

## 8. Validation contract

Checks run across the full consolidated repository, including cross-team references. Local drafts may contain errors, but the MR build and publication gate reject blocking errors. Validation is deterministic and never calls an LLM.

| Severity | Checks |
| --- | --- |
| Error | Unparseable YAML; unsupported schema; required fields missing; unknown fields; duplicate IDs; invalid enum values |
| Error | Track/team mismatch; unknown team, outcome or milestone reference; incomplete or invalid date window; start later than end |
| Error | Self-dependency or cycle among hard finish-to-start dependencies |
| Error | Dated finish-to-start ordering conflict; committed milestone without dates |
| Error | Unsafe paths, prohibited reference URL schemes or malformed review metadata |
| Warning | Undated target; undated hard dependency cannot be checked; dependency on a cancelled item |
| Warning | Missing review metadata; review older than configured interval; missing rationale for supplied confidence |
| Warning | Changed milestone has downstream consumers; accountable team should review impact |

Do not warn about overload or declare feasible dates: no capacity model exists. Parallel windows alone are not errors. Informational related-to links do not participate in cycle or date ordering checks. Warnings remain visible in MR reports and require acknowledgement in the sharing summary but do not block CI by default.

Findings include a stable diagnostic code, severity, file, entity ID, field, explanation and suggested correction. Local and CI checks must give the same results for the same files and pinned tool version. Review timestamps are updated only on an explicit human review action, never merely because the agent opened or changed a file.

## 9. GitLab MR and publication flow

### 9.1 Share a proposal

The local review screen shows the exact remote, target branch, staged file set, semantic changes, validation findings and publication consequence. “Push branch & open MR” is the explicit sharing action. The equivalent agent command requires an explicit instruction to share; selecting an item or queuing a reply does not authorise a push.

Before committing, recheck the working files against the reviewed hashes and validate the exact proposed committed tree. Do not include unrelated dirty or previously staged files. If additional staged changes exist, stop and report them rather than changing their staging silently.

Push the scenario branch and create an MR using the configured GitLab project. Include purpose, affected tracks and teams, before/after dates, assumptions, diagnostics and reviewer suggestions. Reuse an existing open MR for the same source and target rather than creating duplicates. Successful push followed by failed MR creation is reported as “branch pushed, MR not created”; retry creation without duplicating the commit.

Credentials remain in the local Git credential mechanism/environment or protected CI configuration. Push and MR API calls execute in the `atlas serve` process using that process's credentials; the MCP adapter only requests them, so sharing behaves the same from the UI, from Claude and from Codex. Tokens are never placed in browser code, roadmap files or published artifacts. V1 does not merge MRs from the app; approval and merge remain in GitLab.

### 9.2 MR pipeline

Every MR runs schema and whole-repository validation, then builds a static proposal bundle and machine/human-readable reports. The site bundle contains the proposed roadmap and a visible “MR proposal — not published” label, source commit and target baseline metadata. Artifact retention is configurable.

Download and extract the site bundle, then serve it with the supplied local preview command. An artifact browser may be available, but the product does not promise that GitLab will execute the application inline. If artifacts expire or a job fails, show an actionable state. A dedicated per-MR hosted preview is later work.

### 9.3 Default-branch publication

After merge, validate again and generate a complete static site and JSON payload from that commit. Publish through GitLab Pages. Assets and data ship in one deployment; the browser loads same-origin JSON from that snapshot. It does not call the GitLab repository API, Jira or an agent runtime. No browser token is needed to fetch source files.

Only the configured default branch may update the official site. Serialise deployments and prevent an older pipeline from overwriting a newer revision. A failed validation, build or deployment leaves the prior successful deployment available. Expose build/deployment failures in CI and the local publishing status.

The UI records the source commit and build timestamp. Deployment completion and pipeline URL are recorded in CI/local status; do not present build time as exact publication time. The published page can accurately say “Built at” and “Source revision.” Each track separately displays “Last reviewed” and reviewer; never infer that field from Git history. Optional track “Last changed” may be derived from Git during export with clearly documented semantics.

Reverting a merged change uses a new MR and a new validated deployment. No per-team release numbering is necessary.

## 10. Technical architecture

Proposed implementation: Python for typed models, YAML loading, validation, semantic comparison, atomic file updates, Git/GitLab operations, CLI, local HTTP service and MCP tools. Use a small React/TypeScript frontend with shared viewer components for local and static modes. Pin dependencies when implementation begins; concrete framework and SDK versions remain implementation choices.

The local service owns the reply inbox and proposal store, exposes a loopback API to the viewer and streams local state changes. The MCP subprocess is an adapter to that service. Both operate on one explicitly configured repository root. The static build contains the viewer and generated payload only; Python and MCP are not deployed to Pages.

Proposed CLI surface:

```text
atlas init                         # scaffold repository and CI template
atlas serve                        # start localhost workspace
atlas mcp --workspace <path>        # agent client subprocess adapter
atlas mcp install --client <name>  # register the adapter with claude or codex
atlas validate --format json       # shared checks
atlas export --output <directory>  # validated snapshot and static viewer
atlas scenario create <name>
atlas compare --base <revision>
atlas mr prepare
atlas mr submit --plan <id>
atlas preview <artifact-directory>
```

Command names are illustrative contracts for implementation, not existing commands. The local service must bind to loopback, reject unexpected origins/hosts and authenticate state-changing browser requests with a per-session credential. A visited web page must not be able to instruct the local service to edit or push files. Paths are constrained to the repository; proposals cannot escape it via traversal or symlinks. Render text safely and treat agent responses and roadmap content as untrusted display content.

Use atomic file replacement and optimistic content-hash checks. Proposal operations affecting several files must either complete together or recover to the prior state. Keep local request/proposal logs out of exported payloads. The site is read-only but may contain internal plans: repository privacy does not by itself establish Pages privacy. Verify Pages access control on the intended instance before publication.

## 11. Acceptance criteria

1. A fixture containing two teams and at least three tracks renders correctly in both timeline and list views, including a cross-team dependency.
2. Selection attaches immutable item references to a reply. The queue survives restart; an idle agent remains visibly waiting without a false “connected and processing” claim.
3. Both supported agent clients can discover the MCP tools, claim a reply, read its context, propose a change and return a response, in each authentication mode: Claude Code and Codex CLI, each with a provider API key and with a subscription login (four combinations, API key first). This must be verified with real clients, recording client version and active authentication mode, before claiming compatibility. No provider credential is read, stored or exported by Atlas in any combination.
4. A date change produces a before/after preview. Acceptance changes local files; rejection leaves them unchanged. A stale proposal cannot overwrite a newer edit.
5. Broken references, hard dependency cycles and date conflicts produce precise findings. Fixing them gives identical local and CI results.
6. Scenario edits leave the baseline and published site unchanged. Switching a dirty branch requires an explicit resolution.
7. The MR flow pushes only reviewed files, opens or reuses the correct MR, and recovers from a successful push followed by an API failure.
8. The MR pipeline supplies validation reports and a downloadable, locally runnable site bundle labelled as a proposal.
9. Merging a valid MR publishes the consolidated site with matching source revision and bundled payload. An older or failed pipeline cannot replace a newer successful site.
10. The static viewer works without runtime API calls, external fonts or external scripts. Published mode has no agent or editing controls.
11. Review metadata changes only on explicit review. Unreviewed and stale tracks are identified without extra status colours.
12. Keyboard selection, reply composition, focus visibility and text contrast are verified. Local request security and repository path restrictions are exercised.

Use meaningful unit tests for validation and reference semantics, integration tests for proposal atomicity and Git recovery, browser tests for selection and comparison, and an end-to-end test against a GitLab test project for the MR-to-Pages journey. A mocked pipeline alone does not satisfy the publication acceptance test.

## 12. Delivery sequence

All steps below are part of the first release, including MR creation and Pages publication.

1. Establish the schema, sample repository and shared validator; prove static export and CI on a GitLab test project. Run two early spikes: a one-tool stdio adapter against both real clients in API-key mode, and runner/Pages access control on the intended GitLab instance.
2. Build the shared viewer, local service, file refresh and baseline comparison using the agreed visual direction.
3. Add contextual selection, durable inbox, proposal review and MCP tools; verify Codex and Claude interoperability.
4. Implement the reviewed commit/push/MR operation and pipeline artifacts, then complete the merge-to-Pages path.
5. Run the full acceptance journey, failure recovery and access-control checks; document setup and supported versions.

## 13. Open decisions and proposed defaults

| Decision | Proposed position | Blocking point |
| --- | --- | --- |
| Product name | Delivery Atlas as working name | Before branding |
| Accent ratio | Sparse amber; exact ratio remains open | Before visual sign-off |
| GitLab instance, project and default branch | Configurable; main used in examples | Before live integration |
| Runner and Pages availability/access | Verify on intended GitLab instance | Before end-to-end publication |
| Review and merge policy | Team-owned files; affected teams named for dependency changes | Before shared rollout |
| Track review interval | Configurable, initial 30 days | Can proceed with provisional default |
| Supported agent clients | Claude Code CLI and Codex CLI, each with API key (priority) and subscription login; exact versions to be tested | Before compatibility claim |
| Reply dispatch | Explicit agent instruction to process local inbox in v1 | Settled baseline; automatic dispatch deferred |
| Authoring schema and dependency rules | YAML and inclusive calendar dates as defined above | Approve during schema review |

## 14. Reference documentation

These primary sources inform the proposed integration. Implementation must pin compatible versions and verify actual instance capabilities.

- MCP stdio transport: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/transports/stdio.mdx
- MCP tools: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx
- GitLab merge requests API: https://docs.gitlab.com/api/merge_requests/
- GitLab job artifacts: https://docs.gitlab.com/ci/jobs/job_artifacts/
- GitLab Pages: https://docs.gitlab.com/user/project/pages/
