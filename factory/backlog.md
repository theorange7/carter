# Backlog

One feature per `- [ ]` line. `/factory next` takes the topmost one that is
not blocked, ticks it, and records the job id it became.

A line may start with an ID in brackets and end with an after: list naming
the lines it waits for, `<ID>` in this backlog or `<slug>/<ID>` in another
Factory's. For example, `- [ ] [L2] Add the export button after: L1, shop/L4`
stays blocked until the lines `[L1] …` here and `[L4] …` in the Factory
`shop` are claimed by Jobs that have merged.

- [ ] Write the AGENTS.md factory section
