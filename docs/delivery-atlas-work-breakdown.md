# Delivery Atlas implementation slices

Source: [spec v0.1](specs/delivery-atlas-v0.1.md). Each DA ID maps to one factory job. The spec governs behavior; these slices define scope and acceptance, not permission to publish.

After DA01 establishes shared contracts and a runnable path, validation, viewer, service and scenario work can proceed independently. Use contract fixtures to avoid unnecessary dependencies. Keep shared configuration edits in the owning slice. S1, S2, DA17, DA18 and DA18S require real environments; missing access is a blocker, not grounds to substitute mocks. All first-release scope is retained. The review interval defaults provisionally to 30 days; use an explicit evaluation date for reproducible review-age diagnostics. Name/accent sign-off, GitLab instance policy and exact client versions remain open decisions.

## DA01: Establish an installable offline validation tracer bullet

Depends on: BOOT.

Package the Python CLI and shared application contracts; pin dependencies and document development/test commands. Define typed authored schema, diagnostics, generated viewer payload, workspace/reply/proposal and comparison interfaces so parallel slices can use fixtures. Ship a two-team, three-track fixture with cross-team dependencies and atlas validate through the real loader. Resolve the track schema_version example/table ambiguity explicitly. Acceptance: clean installation and offline fixture validation work; IDs and dates survive serialization; interfaces and extension ownership are documented.

## S1: Spike — one-tool stdio adapter against real Claude Code and Codex CLI

Depends on: DA01. Spike; nothing depends on it, findings inform DA04, DA10 and DA18.

Question: does a minimal stdio MCP server exposing only `workspace_status` register and answer in the Claude Code CLI and the Codex CLI on this host, in API-key mode first and subscription mode where a login already exists? Record client versions, the active authentication mode per run, the negotiated protocol version, which environment variables each client passes to the server, whether the server runs inside any client sandbox, start and tool timeouts, output size limits, and the exact registration commands (`claude mcp add`, `codex mcp add`) and headless invocations (`claude -p`, `codex exec`) that worked. Never quote a credential value. A client or credential that is unavailable is reported as such, not mocked.

## S2: Spike — runner and Pages capabilities on the intended GitLab instance

Depends on: DA01. Spike; nothing depends on it, findings inform DA12, DA15 and DA17.

Question: on the intended GitLab instance and a test project, are runners available, can Pages be published with access control matching repository privacy, can deployments be serialised, and are CODEOWNERS approvals actually enforced? Record instance version, settings observed and evidence. Missing access is reported as an external blocker. Change no ownership or security policy.

## DA02: Validate the complete roadmap and report actionable diagnostics

Depends on: DA01.

Implement every error and warning in spec §8, including unknown fields, globally unique per-type IDs, track-scoped outcomes, team contributors, confidence rationale, complete review pairs, hard cycles, inclusive date ordering, cancelled predecessors and downstream impact. Use an explicit evaluation date for age checks. Acceptance: CLI text/JSON reports include code, severity, file, entity, field and correction; local/CI agree for identical inputs and evaluation date; related_to and parallel windows do not trigger hard ordering checks; review metadata is never silently updated.

## DA03: Browse a fixture in accessible timeline and list views

Depends on: DA01.

Build shared React/TypeScript viewer against the agreed payload. Include team/track/time filters, dependency inspection, track expansion, horizontal navigation, unscheduled section and labelled status/commitment. Apply warm charcoal/taupe and sparse amber without asserting a 70/25/5 ratio. Acceptance: both views expose equivalent two-team/three-track information; keyboard inspection, narrow-screen list layout, safe text rendering and visible focus work; static mode excludes editing/agent controls and external assets.

## DA04: Inspect a secure local workspace with live file refresh

Depends on: DA01.

Implement loopback service, atlas serve and workspace status/read APIs with one explicit repository/worktree root. Define authenticated local adapter access: a per-session token in an owner-only (0600) file under `.delivery-atlas/`, never an environment variable the agent client must pass through. Watch files and stream changes, showing diagnostics and a labelled last-valid snapshot for invalid edits. Acceptance: unexpected hosts/origins and unauthenticated mutations fail; traversal/symlink escape fails; direct edits are identified; service and clients use one state owner. Use contract fixtures until full viewer integration.

## DA05: Create scenarios and compare against an explicit baseline

Depends on: DA01.

Implement shared Git services and atlas scenario create/compare. Report base commit, target revision, semantic additions/removals/date changes/dependency effects and exact file diff. Acceptance: branches are ordinary Git branches, dirty state requires explicit resolution, baseline remains unchanged, advanced target is labelled stale, fetching is explicit, and no silent stash/rebase/discard occurs. Include worktree isolation and rename-by-stable-ID tests.

## DA06: Persist and lease contextual replies in each checkout

Depends on: DA04.

Implement durable .delivery-atlas inbox and reply state transitions, per-session leases, idempotency and recovery. Store request/repo/worktree/branch/base identities, selected IDs/hashes, approved context and UTC timestamp. Acceptance: restart retains queue; competing claims cannot both win; expiry is recoverable; clarification/failure/cancellation can be resumed explicitly; renamed IDs retain identity, deleted/content-changed/branch-changed selections require fresh context; queues never mix worktrees; no provider credential or environment dump is stored in an envelope or context snapshot. Session IDs are generated per adapter process and stored with the client name and version.

## DA07: Review and atomically apply validated proposals

Depends on: DA02, DA04, DA05.

Implement propose/validate/accept/reject application services with expected hashes, affected IDs, rationale and preview diff. Require scenario creation on protected baseline before edits and explicit local acceptance before apply. Acceptance: rejection changes no authored files; stale or unaccepted proposals cannot apply; multi-file fault injection restores prior state or completes recovery; retries do not duplicate edits; paths remain confined; unrelated dirty files are not overwritten; direct edits cannot acquire retroactive approval.

## DA08: Select roadmap context and queue replies in the local UI

Depends on: DA03, DA06.

Connect shared viewer to workspace and inbox. Support milestone, track and multi-item selection with removable reference chips, approved context snapshot, keyboard composer and side panel history/clarification. Acceptance: idle queues say Waiting for agent, never imply automatic dispatch; selecting two milestones supplies no dependency direction; stale rendering is labelled; findings navigate to entity/field; static output has no reply UI.

## DA09: Inspect scenario and proposal changes and accept or reject locally

Depends on: DA07, DA08.

Add comparison and proposal views with baseline outlines/proposed bars, before/after dates, exact files/items, validation diagnostics and direct-edit labels. Integrate explicit human review metadata action. Acceptance: keyboard users can review/accept/reject; accepted changes refresh the viewer; stale comparisons/proposals require reread; rejection preserves files; review dates change only through explicit review.

## DA10: Expose planning workflow over the bundled stdio MCP adapter

Depends on: DA06, DA07.

Implement atlas mcp --workspace, atlas mcp install --client claude|codex, and workspace_status, list_tracks, read_items, list_replies, claim_reply, request_clarification, propose_changes, validate, apply_proposal, complete_reply, compare_scenario and create_scenario. Pin SDK/protocol and use shared service state rather than an independent inbox. Acceptance: structured IDs/revisions/actionable errors, lease/idempotency behavior and local acceptance gate are exercised through the transport; no hosted runtime, provider credentials or idle-session wakeup is required; the adapter uses tools only (no sampling or elicitation), negotiates protocol version, writes nothing but protocol messages to stdout, bounds or paginates read_items and compare_scenario output, returns an actionable error when atlas serve is not running, and works with an environment stripped of everything except PATH and HOME; a test with dummy ANTHROPIC_API_KEY and OPENAI_API_KEY set proves neither value appears in logs, the inbox or tool output.

## DA11: Export and preview a validated standalone roadmap snapshot

Depends on: DA02, DA03.

Implement atlas export/preview using same validator and shared static viewer. Bundle assets and same-origin JSON together, source commit/build UTC metadata and separate track review metadata. Support official and clearly labelled MR proposal provenance including target baseline. Acceptance: invalid repositories fail export; downloaded/extracted bundle runs offline without external fonts/scripts/runtime API calls; local logs, GitLab and provider credentials and editing controls are absent; build time is never called publication time.

## DA12: Scaffold a pinned planning repository and MR validation pipeline

Depends on: DA11.

Implement atlas init with discovered track layout, sample roadmap, pinned tool, README, gitignore, CODEOWNERS template and GitLab CI. MR jobs validate whole repository and produce JSON/human reports plus proposal bundle with configurable retention. Acceptance: fixture pipeline configuration and local CI commands agree; preview instructions work after extraction; warnings remain visible without blocking by default; expired/failed artifact states have actionable guidance; existing files are not silently overwritten.

## DA13: Prepare and submit reviewed GitLab merge requests safely

Depends on: DA02, DA05.

Implement atlas mr prepare/submit --plan with immutable reviewed hashes, remote/target, exact files, semantic summary, warnings acknowledgement, rationale and suggested affected-team reviewers. Revalidate exact committed tree and stop on unrelated staged files. Acceptance: explicit submit authorization required; only reviewed files commit; existing source/target MR reused; pushed-but-API-failed state and retry avoid duplicate commits; credentials stay outside browser/payload; push and MR API calls run in the atlas serve process and behave the same however the requesting agent client was launched or authenticated; provider credentials are stripped from Git child-process environments; integration tests exercise Git and API recovery; app cannot merge MRs.

## DA14: Share reviewed changes through the UI and MCP

Depends on: DA09, DA10, DA13.

Add review/share screen and prepare_merge_request/submit_merge_request MCP tools using the shared immutable plan. Show remote, target, exact file set, findings, warning acknowledgement and publication consequence before explicit Push branch & open MR action. Acceptance: queued replies cannot authorize sharing; changed hashes invalidate plan; user sees partial push/MR failure and safe retry; MR excludes full local conversation by default; secrets never reach browser.

## DA15: Publish default-branch snapshots with ordered GitLab Pages deployment

Depends on: DA12.

Extend CI to validate/build/deploy only the configured default branch. Serialize deployment and enforce revision freshness so delayed old pipelines cannot overwrite newer output; preserve last successful deployment on failures. Acceptance: source revision and bundled data match, branch pipelines cannot update official site, failed deploy/validation retains previous site; CI records completion and pipeline URL separately from build time. Include executable automated checks; real-instance proof belongs to DA17.

## DA16: Show GitLab publishing and artifact status locally

Depends on: DA04, DA13, DA15.

Expose optional authenticated GitLab status through local service/UI: latest successful deployed revision, pipeline/deployment failures, completion time and URL, MR bundle availability/expiry. Acceptance: published snapshot lag is explicit; missing credentials/network do not break local planning; tokens remain server-side; build/deployment times remain distinct; no remote calls originate from static viewer.

## DA17: Verify MR-to-Pages behavior on the intended GitLab instance

Depends on: DA14, DA15, DA16.

Preconditions on the host: network access to the instance, a GitLab credential with push and MR rights on the test project, and the S2 findings. Obtain configured test instance/project/default branch and verify runners, Pages availability/privacy and actual ownership/approval enforcement. Run real reviewed push/MR/artifact download/merge/publication journey and older/failed pipeline recovery; record commands, revisions and evidence. Acceptance: spec AC7–9 are demonstrated on the instance, including payload/revision equality and access control. Missing credentials/access is a reported external blocker, never replaced by mocked evidence; do not change ownership/security policy without explicit authorization.

## DA18: Verify real Codex and Claude interoperability with API-key authentication

Depends on: DA09, DA10.

Preconditions on the host: Claude Code CLI and Codex CLI installed; ANTHROPIC_API_KEY and an OpenAI API key available to the job. Configure exact client versions with atlas mcp install and drive each headlessly (claude -p, codex exec) through a repeatable script committed to the repo. For each client, discover tools, claim a contextual reply, read IDs, clarify ambiguity, propose date change, receive local acceptance and return response. Acceptance: evidence records client version, confirmed API-key mode and full lifecycle; waiting idle state is honest, competing/stale requests are safe, restart recovery works; Atlas needs no provider key and none appears in the inbox, logs, MR text or export. Missing client or key is an explicit blocker; mocks do not establish compatibility; never quote a key value.

## DA18S: Verify real Codex and Claude interoperability with subscription login

Depends on: DA18.

Preconditions on the host: both CLIs logged in with a subscription account and no provider API key in the environment; the logins are interactive and must be done by a human beforehand. Rerun the DA18 lifecycle for each client, reusing its script where the client permits headless use under a login and otherwise recording a human-assisted run. Acceptance: evidence records client version and confirmed subscription mode (for example codex login status and the Claude Code status output) for each run; behaviour matches DA18; any difference between modes is documented with its cause. A missing login is an explicit blocker for a human, never replaced by API-key evidence.

## DA19: Complete release acceptance, accessibility and recovery verification

Depends on: DA17, DA18, DA18S.

Run all twelve spec acceptance criteria end to end, offline local workflow, keyboard/focus/contrast checks, narrow layouts, hostile content/origin/path cases, proposal crash recovery and Git partial-failure tests. Document install/pinned versions, MCP setup for both clients in both authentication modes, scenario recovery, CI/artifact preview, Pages privacy and rollout policy. Acceptance: traceable evidence for each criterion and resolved release blockers; open name/accent decisions remain identified until human sign-off; no capacity optimization, Jira fetching, autonomous dispatch or hosted previews creep into v1.

