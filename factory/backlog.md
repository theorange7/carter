# Backlog

One feature per `- [ ]` line. `/factory next` takes the topmost one that is
not blocked, ticks it, and records the job id it became.

A line may start with an ID in brackets and end with an after: list naming
the lines it waits for, `<ID>` in this backlog or `<slug>/<ID>` in another
Factory's. For example, `- [ ] [L2] Add the export button after: L1, shop/L4`
stays blocked until the lines `[L1] …` here and `[L4] …` in the Factory
`shop` are claimed by Jobs that have merged.

- [x] [BOOT] Write the AGENTS.md factory section → 001-agents-factory-section

BOOT guidance has landed in `AGENTS.md`. DA01 is ready in a fresh clone; it
does not require importing the completed bootstrap job’s ignored runtime state.

Source: docs/specs/delivery-atlas-v0.1.md. Scopes and acceptance criteria: docs/delivery-atlas-work-breakdown.md.

- [ ] [DA01] Establish an installable offline validation tracer bullet (see docs/delivery-atlas-work-breakdown.md section DA01)
- [ ] [S1] spike: Does a one-tool stdio MCP adapter work in real Claude Code and Codex CLI, API-key mode first? (see docs/delivery-atlas-work-breakdown.md section S1) after: DA01
- [ ] [S2] spike: Does the intended GitLab instance support runners, private Pages, serialised deployment and enforced approvals? (see docs/delivery-atlas-work-breakdown.md section S2) after: DA01
- [ ] [DA02] Validate the complete roadmap and report actionable diagnostics (see docs/delivery-atlas-work-breakdown.md section DA02) after: DA01
- [ ] [DA03] Browse a fixture in accessible timeline and list views (see docs/delivery-atlas-work-breakdown.md section DA03) after: DA01
- [ ] [DA04] Inspect a secure local workspace with live file refresh (see docs/delivery-atlas-work-breakdown.md section DA04) after: DA01
- [ ] [DA05] Create scenarios and compare against an explicit baseline (see docs/delivery-atlas-work-breakdown.md section DA05) after: DA01
- [ ] [DA06] Persist and lease contextual replies in each checkout (see docs/delivery-atlas-work-breakdown.md section DA06) after: DA04
- [ ] [DA07] Review and atomically apply validated proposals (see docs/delivery-atlas-work-breakdown.md section DA07) after: DA02, DA04, DA05
- [ ] [DA08] Select roadmap context and queue replies in the local UI (see docs/delivery-atlas-work-breakdown.md section DA08) after: DA03, DA06
- [ ] [DA09] Inspect scenario and proposal changes and accept or reject locally (see docs/delivery-atlas-work-breakdown.md section DA09) after: DA07, DA08
- [ ] [DA10] Expose planning workflow over the bundled stdio MCP adapter (see docs/delivery-atlas-work-breakdown.md section DA10) after: DA06, DA07
- [ ] [DA11] Export and preview a validated standalone roadmap snapshot (see docs/delivery-atlas-work-breakdown.md section DA11) after: DA02, DA03
- [ ] [DA12] Scaffold a pinned planning repository and MR validation pipeline (see docs/delivery-atlas-work-breakdown.md section DA12) after: DA11
- [ ] [DA13] Prepare and submit reviewed GitLab merge requests safely (see docs/delivery-atlas-work-breakdown.md section DA13) after: DA02, DA05
- [ ] [DA14] Share reviewed changes through the UI and MCP (see docs/delivery-atlas-work-breakdown.md section DA14) after: DA09, DA10, DA13
- [ ] [DA15] Publish default-branch snapshots with ordered GitLab Pages deployment (see docs/delivery-atlas-work-breakdown.md section DA15) after: DA12
- [ ] [DA16] Show GitLab publishing and artifact status locally (see docs/delivery-atlas-work-breakdown.md section DA16) after: DA04, DA13, DA15
- [ ] [DA17] Verify MR-to-Pages behavior on the intended GitLab instance (see docs/delivery-atlas-work-breakdown.md section DA17) after: DA14, DA15, DA16
- [ ] [DA18] Verify real Codex and Claude interoperability with API-key authentication (see docs/delivery-atlas-work-breakdown.md section DA18) after: DA09, DA10
- [ ] [DA18S] Verify real Codex and Claude interoperability with subscription login (see docs/delivery-atlas-work-breakdown.md section DA18S) after: DA18
- [ ] [DA19] Complete release acceptance, accessibility and recovery verification (see docs/delivery-atlas-work-breakdown.md section DA19) after: DA17, DA18, DA18S
