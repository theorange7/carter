# Carter interactive prototype

A fictional roadmap for exploring a small planning change, reviewing its impact
and accepting it into a browser-local scenario. This is an interaction prototype;
it does not implement the production Python/React application or complete any
DA01–DA19 release acceptance slice.

## Open it

No dependencies or package installation are needed. From the repository root:

```sh
python3 -m http.server 5120 --bind 127.0.0.1 --directory prototype
```

Open <http://127.0.0.1:5120/>. Stop the server with Ctrl+C. You can also open
[index.html](index.html) directly using `file://`; keep its sibling CSS and JS
files together. All assets are local. No model, MCP or remote API is called.

For a single downloadable offline file:

```sh
python3 prototype/bundle.py
```

Open the resulting `prototype/carter.html`. It embeds the same styles and code,
requires no server and is ignored by Git. A specific output path is supported:
`python3 prototype/bundle.py --output /tmp/carter.html`.

## Guided flow and capture walkthrough

1. Start at desktop width, ideally 1440 × 1000. Browse the timeline, switch to
   List, and try the team/track/time filters. The Q2 filter shows the second
   agency wave; undated targets remain visible regardless of the time window.
2. Select **Migration rehearsal** and **Standard images refresh**. Both appear
   as removable reference chips. Remove the images chip. Dependencies are shown
   in the details panel; rehearsal depends on the other team's landing zone.
3. Choose **Use rehearsal example**. This selects the rehearsal and supplies a
   note. Keep the **Move first dated selection +7 days** simulation preset.
4. Choose **Queue reply**. Observe **Waiting for agent**. Dates have not changed.
5. Choose **Run demo agent · simulation** in the conversation. Read the selected
   context, demo response, affected record, before/after window and findings.
   This fixed preset moves the first dated selected item; arbitrary reply text
   is retained as a note and is never interpreted by a model.
6. Choose **Reject proposal** and confirm the dates stay 01–19 February. Queue
   the example again, run it, then **Accept in scenario**. The scenario now uses
   08–26 February; comparison shows the original fixture and changed dates.
7. Reload to verify the scenario and conversation persist. Open **Compare with
   baseline** to inspect changes. The baseline stays fixed.
8. Choose **Reset demo**, then the rehearsal example with the **Try dependency
   conflict (+35 days)** preset. Queue and run it. Acceptance is disabled because
   the rehearsal would end after the first agency wave starts. Reject it and use
   the +7 days preset to recover.
9. For stale-state recovery, queue two rehearsal replies before accepting either.
   Run both, then accept one. The other proposal is stale and cannot apply;
   reject it and queue fresh context. Reset restores the original fixture.

Useful capture states: initial timeline → selected context/composer → waiting
reply → proposal/date comparison → accepted scenario/baseline comparison. Scroll
only as needed so text is readable. Capture the real running UI; no GIF or browser
evidence is bundled with this source. The orchestrator records that separately.

## Scope and state

The fixture has two fictional teams, three tracks, seven milestones, one
cross-team predecessor and an unscheduled target. Timeline and list use the same
records and filters. Select a track to attach all of its milestones. Selecting
multiple items does not invent a dependency direction.

Only browser records change. There are no YAML file edits, Git branches,
filesystem writes, credentials, durable service inbox, real model reasoning,
MCP transport or GitLab sharing/publication. The named scenario is compared with
**Fixture baseline · 04 Jan 2027**, not a real repository commit.

The prototype checks date windows and hard predecessor ordering only. It does
not implement the whole schema validator, cycle analysis, capacity optimisation
or feasibility certification. Errors and stale proposals block acceptance.

State is saved as `carter.prototype.v1` in this browser's localStorage. It is
scoped to the current origin/profile; `file://` storage behavior varies by
browser. Changing the port or opening a bundled copy may create a different
storage scope. Reset overwrites only this demo key. If storage is blocked/full,
the interface stays usable in memory and explains that reload will lose changes.
Malformed/incompatible saved data falls back to the fixture with a recovery
notice. Do not enter sensitive work data into this demo.

## Verification

From the repository root, if Node.js is available:

```sh
node prototype/model.test.cjs
node --check prototype/model.js
node --check prototype/app.js
python3 prototype/bundle.py --output /tmp/carter-prototype.html
git diff --check
```

The dependency-free Node checks exercise queue immutability, explicit acceptance,
rejection, dependency conflicts, stale context, baseline comparison, undated-item
clarification, persistence and malformed state. They do not prove browser layout,
keyboard behavior or production compatibility. Review the running UI at desktop
and 390px width, including hostile-looking text displayed literally, and record
browser evidence separately.

## Keyboard review checklist

Use ordinary Tab, Shift+Tab, Enter and Space in the real browser; do not jump
between individually targeted elements to infer focus continuity.

- Tab to a milestone label or timeline bar; press Space. Focus stays on that
  same control after its selected state changes. The next Tab advances within
  the roadmap rather than restarting at Carter home. Repeat for Select track.
- Tab to a reference chip's remove button; press Enter. Focus moves to the next
  remaining remove button, or the reply textarea when no references remain.
- From the composer, Tab to Queue reply and press Enter. Focus moves to the new
  reply's Run demo agent button; its waiting state is visible above it.
- Press Enter to run the simulation. Focus moves to the proposal review region;
  the next Tab reaches Reject proposal, followed by Accept in scenario when valid.
- Reject with Enter: focus moves to that reply's rejection status. Accept with
  Enter instead: focus moves to the scenario comparison heading, with changed
  dates directly below. Neither transition restarts Tab at the page root.
- Open a predecessor detail or use Compare with baseline: focus moves to the
  resulting details/comparison. Close comparison returns focus to the main comparison control.

These are manual verification steps, not a claim of automated browser coverage.
Narrow-screen behavior requires a real supported viewport check; CSS inspection
or a desktop screenshot does not establish mobile verification.
