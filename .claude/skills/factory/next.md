# Factory: /factory next

Part of the factory skill, read from `SKILL.md`.

## /factory next

**Line syntax.** A backlog line's text is what follows `- [ ] `, `- [h] ` or
`- [x] `. It may start with an ID in brackets and a space, such as
`[L23] Implement the merge gate`, where an ID is a letter followed by letters,
digits or hyphens; IDs are case-sensitive. It may end with a space, `after:`,
one or more spaces and one or more comma-separated references, such as
`after: L22, kosf/L7`. A reference is an `<ID>` of this Factory's lines or
Specs (see **Blocked**), or `<slug>/<ID>` for one of another Factory. On a
claimed line, `- [x] <text> → <job-id>`, the `<job-id>` is everything after
the last ` → `. Text of any other shape is just title text.

**Blocked.** A bare `<ID>` may be carried by:

- a line of `factory/backlog.md`, claimed when it is `- [x] … → <job-id>`;
- an inbox Spec, `factory/inbox/*.md` or `factory/inbox/held/*.md`, whose
  leading frontmatter (its first line `---`, up to the next `---` line) has
  `id: <ID>`, which is unclaimed;
- a `factory/jobs/<job-id>/spec.md` whose leading frontmatter has
  `id: <ID>`, which is claimed by `<job-id>`.

A bare `<ID>` reference is satisfied when exactly one of these carries that
ID, it is claimed by a `<job-id>` of lowercase letters and digits in groups
joined by single hyphens, and `factory/jobs/<job-id>/job.json` has
`stage: "merged"`. A line with an after: list is blocked while any of its
references is not satisfied. A line without one is never blocked. A
reference to an ID that nothing or several carriers carry, or to a Job that
ended `cancelled`, can't be satisfied as written, and neither can references
that lead back to their own line through unclaimed lines and inbox Specs,
following an inbox Spec's frontmatter `after:` list: such a line stays
blocked until a human edits, holds or withdraws it.

**Claim.**

- Launched by the Control Plane, with the `Factory next: line <n>` line of
  **job.json** in your system prompt: serve has already checked every
  reference, other Factories' included. Claim line `<n>` of
  `factory/backlog.md` (counting from 1) only when it is a `- [ ]` line that
  no bare `<ID>` reference blocks, checked by reading `factory/backlog.md`,
  the inbox Specs' and `factory/jobs/*/spec.md` frontmatter, and the
  `job.json` files they name. Otherwise say why and stop, claiming
  nothing. An Edit that fails also means stop.
- Any other run: claim the first `- [ ]` line that is not blocked, skipping
  blocked ones. You can't see other Factories, so count every `<slug>/<ID>`
  reference as blocking. An Edit that fails because the line no longer
  matches means another session won the item: read the backlog afresh and
  claim the next unblocked `- [ ]` line instead. When no unblocked `- [ ]`
  line is left, say so and stop.

Claim with a single Edit that turns that exact line into
`- [x] <item> → claimed`, where `<item>` is the line's whole text, ID and
after: list included. Then run `/factory <item>` with that same text. Once
step 1 has assigned an id, swap `claimed` on the item's backlog line for that
id.
