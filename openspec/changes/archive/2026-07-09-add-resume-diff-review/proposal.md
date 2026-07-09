## Why

When the interview agent proposes a resume edit today, the candidate reviews it as a JSON blob in a chat
side-panel (`ProposalCard` in `app/src/components/basic/chat.tsx`) — scalar fields (name, location, title) get a
correct strikethrough-red/green-below diff, but list fields (experiences, educations, projects, links, skills)
are `JSON.stringify`'d whole-array dumps, and rich-text fields (summary, descriptions) diff a Lexical AST blob
against a plain string. The candidate can't see where in their actual resume a change lands, and can only
accept or reject an entire proposal at once, even when it bundles a change they want with one they don't.

## What Changes

- Add a "diff" render mode to the resume canvas (`app/src/resume-engine`) that shows a pending proposal directly
  in the rendered resume layout — old values struck through in red, new values in green immediately below —
  for every node type the template engine supports (Text, RichText, List leaf and repeater).
- Normalize rich-text fields (Lexical JSON vs. the agent's plain-text proposal) to a comparable plain-text form
  before diffing, instead of comparing an AST blob to a sentence.
- Diff list fields (experiences, educations, projects, links, and the nested skill-groups/skill-chips structure)
  entry-by-entry using positional (index-aligned) correspondence between the old and new arrays; entries beyond
  the shorter array's length are treated as pure additions or removals. Removed entries render struck through at
  their original index.
- Introduce granular, per-unit review: one accept/reject/pending tri-state per top-level scalar field and per
  list entry (a whole entry is one decision, even when several of its fields changed), instead of one
  accept/reject for the entire proposal.
- Decisions accumulate client-side across the whole proposal; a single "done reviewing" action reconciles the
  accepted/rejected units into one final object and fires exactly one `PATCH /api/profile/:id` plus one grouped
  outcome message back to `ai-server` — no per-click partial writes.
- **BREAKING**: `ai-server`'s `proposal_outcome` contract changes from a single `{ proposal_id, approved: boolean }`
  to a per-unit decision list, so the agent can react to partial acceptance (e.g. "kept your old location, applied
  the new end date"). This is an internal `app` ↔ `ai-server` contract, not a public API.

## Capabilities

### New Capabilities
- `resume-diff-rendering`: computing and rendering old-vs-new differences for every resume-engine node type
  (scalar text, rich text, list leaf, list repeater, nested skill-groups), including rich-text normalization and
  positional list-entry correspondence.
- `granular-proposal-review`: the per-field/per-entry tri-state review workflow — accumulating decisions client-side,
  batching them into a single reconciled write, and reporting per-unit outcomes back to the agent.

### Modified Capabilities
(none — no existing specs precede this change)

## Impact

- `app/src/resume-engine/registry/node-registry.tsx`, `registry/editable-overlay.tsx`, `registry/nodes/*.tsx`,
  `types/template.ts`, `types/resume-data.ts`, `render/resume-canvas.tsx`, `binding/resolve-binding.ts`,
  `lexical-json/*` — new diff-mode rendering path threaded alongside the existing interactive/static modes.
- `app/src/app/(dashboard)/profiles/components/profile-editor.tsx`, `form-edit-panel.tsx` — wiring a pending
  proposal into the canvas's diff mode, and the batched-commit reconciliation logic.
- `app/src/components/basic/chat.tsx`, `app/src/apis/chat.ts` — `ProposalCard`/`Proposal` types extended for
  per-unit decision state instead of one status per proposal.
- `ai-server/src/agent/graph.py` — `proposal_outcome` schema and system-prompt guidance updated for per-unit
  outcomes.
- No `api-server` or Prisma schema changes — `PATCH /api/profile/:id` already accepts the reconciled partial
  object; only its caller-side construction changes.
