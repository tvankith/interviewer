## Context

The resume canvas (`app/src/resume-engine`) renders a `TemplateDocument` tree through a single choke point,
`RenderNode` in `registry/node-registry.tsx`. Every leaf node (`Text`, `RichText`, `List`) resolves its value via
a dot-path `binding` against a `BindingScope` (`{ value, absolutePath }`) that's threaded down from the root
`ResumeData`, and repeaters (`List` with `itemTemplate`) re-scope `value` to one array element per iteration.
`RenderNode` already carries a `mode: "interactive" | "static"` and, in interactive mode, wraps any editable
node's output in an injected `editableWrapper` component (currently `EditableOverlay`) — registered only from
the client entry point (`resume-canvas.tsx`) so the node components and `node-registry.tsx` itself never import
client-only code (Radix Popover, Lexical hooks), keeping the server-only static-render path
(`render-static-html.ts`, used for PDF export) clean.

Separately, `app/src/components/basic/chat.tsx`'s `ProposalCard` already renders a scalar-field diff
(red-strikethrough before / green after, stacked) sourced from `profile-editor.tsx`'s `buildProposalDiff`, which
diffs each of the agent's `proposed_fields` (from `ai-server`'s `propose_profile_update` tool,
`ai-server/src/agent/graph.py`) against the live `react-hook-form` value. List fields are whole-array
replacements with no entry identifiers, and today get `JSON.stringify`'d wholesale rather than diffed per entry.
Approval is currently all-or-nothing: one `Approve` click writes every touched field via a single
`PATCH /api/profile/:id` (already a partial-update endpoint — `api-server/src/routes/profile.ts`), then reports
one `proposal_outcome: { proposal_id, approved: boolean }` back to `ai-server`.

## Goals / Non-Goals

**Goals:**
- Render a pending proposal's diff directly in the resume canvas, in place, for every node type the template
  engine supports.
- Normalize rich-text fields (Lexical JSON vs. the agent's plain-text proposal) into a comparable form before
  diffing.
- Diff list fields (experiences, educations, projects, links, skill-groups, and skills-within-a-group)
  entry-by-entry using positional (index-aligned) correspondence.
- Let the candidate accept/reject individual scalar fields and individual list entries independently, rather
  than the whole proposal at once.
- Accumulate those decisions client-side and reconcile them into exactly one `PATCH` and one grouped outcome
  message when the candidate finishes reviewing.

**Non-Goals:**
- Reordering- or insertion-robust list correspondence (key-based fuzzy matching, or agent-tagged operations).
  Positional matching is the deliberate v1 choice; a proposal that reorders entries will misattribute diffs.
  Revisiting this is a follow-on if it proves to be a real problem in practice.
- Sub-field granularity within a single list entry (e.g., accepting a new `end_date` while rejecting a new
  `location` on the *same* experience entry). A modified entry is one accept/reject unit.
- Persisting an in-progress review across page reloads/navigation — if the candidate abandons a half-reviewed
  proposal, those in-progress decisions are lost (the underlying proposal itself is unaffected and can be
  reviewed again from the chat history).
- Immediate per-decision writes — no partial `PATCH` fires until the candidate finishes reviewing the whole
  proposal.

## Decisions

**1. Diff surface: resume canvas, not just the chat panel.**
A new render mode plugs into the same seam `editableWrapper` already uses, so every current and future node
type (`Text`, `RichText`, `List`) gets diff rendering for free instead of a one-off component. Alternative
considered: extend `ProposalCard`'s existing JSON-blob handling in the chat panel — rejected because it can't
show the change in the resume's actual visual layout (e.g., exactly where a location line sits relative to the
dates line), which is the whole point of the request.

**2. `RenderNode` threads two scopes in diff mode, not one.**
`BindingScope` stays a plain `{ value, absolutePath }`; `NodeComponentProps` gains an optional
`previousScope?: BindingScope` used only when `mode === "diff"`. Container nodes (`Row`/`Column`/`Stack`/
`Section`/`Page`) pass `previousScope` through `renderChildren` unchanged, exactly as they already pass `scope`
— no container node needs new diff-specific logic. Only the three leaf types resolve `previousScope` alongside
`scope` and render a diff decoration when the two values differ:
- `TextNode` — resolves `binding` against both scopes; if different, renders old (struck, red) then new (green)
  in place of the plain value.
- `RichTextNode` — converts both sides through the existing `lexical-json-to-plain-text.ts` helper before
  comparing, since the agent's proposed value is plain text while the stored value is a Lexical doc. The diff
  view itself shows plain text on both sides (rich formatting isn't part of the comparison); the eventually
  *applied* value, if accepted, is still written through the normal Lexical-aware path.
- `ListNode` — see Decision 3.

A new `setDiffWrapper` (mirroring `setEditableWrapper`) registers the actual diff-rendering component
(`DiffOverlay`, living beside `EditableOverlay` in `registry/editable-overlay.tsx`) only from the client entry
point, preserving the existing client/server split that keeps `node-registry.tsx` and the node components free
of "use client" dependencies.

**3. List correspondence: positional (index-aligned).**
`old[i]` pairs with `new[i]`. Where the arrays differ in length, the extra trailing indices in the longer array
are pure additions (if in `new`) or removals (if in `old`) — rendered as whole-entry blocks (green, no strike;
or red, fully struck) rather than field-by-field, since there's no counterpart to diff against. Skills use the
same algorithm twice: once across `SkillGroup[]` by index, then again across each matched group pair's flat
`skills: string[]` by index. Alternatives considered: key-based fuzzy matching (match experience entries by
`company`, education by `institute`, etc.) and agent-tagged operations (extending `propose_profile_update`'s
schema so the LLM states add/modify/remove + which old index) — both rejected for v1 as unnecessary complexity
(fuzzy matching needs its own similarity heuristic per entry type; agent-tagging is a cross-service tool-schema
change) given the risk is bounded and visible (see Risks).

**4. Approval unit: whole scalar field, or whole list entry.**
One tri-state (`pending | accepted | rejected`) per top-level scalar field, and one per list entry (added,
modified, or removed) — even when a modified entry has several changed fields internally. State lives client-side,
scoped to one proposal's review session (e.g. a hook or reducer alongside `profile-editor.tsx`'s existing
`chatMessages` state), keyed by unit id: the field name for scalars, `` `${field}.${index}` `` for list entries.

**5. Reconciliation happens once, on "done reviewing."**
Walk every unit: an accepted scalar field takes its new value; a rejected or still-pending scalar field is
simply omitted from the `PATCH` body (the endpoint is partial-update, so omission means "leave untouched"). Any
list field with at least one accepted entry-unit must be included wholesale (since `PATCH` replaces list fields
entirely) — its final array is reconstructed by walking the same index alignment used for display: an accepted
modified/added entry contributes its new value, a rejected/pending modified entry or a rejected removal
contributes its old value, and an accepted removal contributes nothing. Exactly one `PATCH /api/profile/:id`
fires, immediately followed by exactly one `proposal_outcome` message reporting every unit's final status back
to `ai-server` (so the agent can react to partial acceptance in conversation, e.g. "kept your old location,
applied the new end date").

**6. `ai-server`'s `proposal_outcome` contract changes shape.**
From `{ proposal_id, approved: boolean }` to `{ proposal_id, decisions: [{ unit: string, status: "accepted" |
"rejected" }] }`, where `unit` matches the field/entry keying used client-side. This is an internal `app` ↔
`ai-server` contract (per `CLAUDE.md`, `app` talks to `ai-server` directly, client-side) with no external
consumers, so it's changed in place rather than versioned.

## Risks / Trade-offs

- **[Risk]** Positional correspondence misattributes changes if the agent reorders entries or inserts one in the
  middle of a list, rather than only appending/removing at the ends.
  → **Mitigation**: tighten `ai-server`'s system-prompt guidance for `propose_profile_update` to preserve
  existing entry order and only append new entries / drop removed ones in place, rather than restructuring the
  array. This is a prompt change, not a schema change, and bounds (without eliminating) the risk.
- **[Risk]** The rich-text diff view compares plain text only, so a candidate reviewing a `description` change
  doesn't see rich formatting differences (bold/lists/etc.) even though the underlying stored value is
  Lexical-rich.
  → **Mitigation**: acceptable since the agent only ever proposes plain text — there's no richer proposed value
  to lose. The eventually-applied value keeps its correct Lexical representation regardless of what the diff
  view displayed.
- **[Risk]** Threading a second (`previousScope`) value through every container adds a bit of surface area to
  `node-registry.tsx`'s already-careful render path.
  → **Mitigation**: mirrors the exact pattern already established for `editableWrapper` — an optional injected
  component, registered once from the client entry point, with no new "use client" imports in the node
  components or `node-registry.tsx` itself.
- **[Risk]** `app` and `ai-server` must move together — the `proposal_outcome` shape change is breaking between
  them, and mismatched deploys would silently misreport outcomes.
  → **Mitigation**: both are already deployed together via `docker-compose.yml`; no independent versioning
  scheme exists today or is being introduced here.
- **[Risk]** A candidate who reviews part of a large proposal and navigates away loses that in-progress state
  (by design — see Non-Goals); they'd have to re-review from scratch.
  → **Mitigation**: the underlying proposal and its `before`/`after` values are unaffected (still reconstructable
  from `proposed_fields` + live form values), so re-review is always possible, just not resumable mid-way.

## Open Questions

- What happens to units still `pending` (never explicitly touched) when the candidate clicks "done reviewing" —
  are they treated as implicitly rejected (kept at their old value), or must every unit be explicitly resolved
  before the action is enabled? Current lean is implicit-reject (matches "omission means leave untouched"), but
  worth confirming before implementation.
- Does click-to-edit (`EditableOverlay`) stay active on fields *not* part of the pending proposal while a diff
  review is in progress, or does entering review mode lock the whole canvas read-only until the candidate
  finishes?
- What triggers diff mode on the canvas — does the preview tab auto-switch into it the moment a proposal
  arrives, or does the candidate opt in via an explicit action from the chat's `ProposalCard`?
