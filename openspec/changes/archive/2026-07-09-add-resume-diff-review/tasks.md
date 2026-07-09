## 1. Diff computation utilities

- [x] 1.1 Add a scalar-diff helper that compares two values and returns whether they differ (used by Text nodes)
- [x] 1.2 Add a rich-text normalization helper that extracts plain text from a Lexical `SerializedEditorState` (reuse/extend `app/src/resume-engine/lexical-json/lexical-json-to-plain-text.ts`) so both sides of a rich-text diff are compared as plain text
- [x] 1.3 Add a positional list-correspondence helper that, given an old array and a new array, classifies each index as `unchanged` | `modified` | `added` | `removed`, for use by repeater `List` nodes
- [x] 1.4 Add a nested skill-group correspondence helper that applies 1.3 across `SkillGroup[]` by index, then again across each matched group's `skills: string[]` chips
- [x] 1.5 Define the review-unit id scheme (top-level field name for scalars; `` `${field}.${index}` `` for list entries) as a small shared module both the canvas and the reconciliation logic import

## 2. Resume-engine: diff render mode

- [x] 2.1 Add `"diff"` to `RenderMode` in `app/src/resume-engine/registry/node-registry.tsx`
- [x] 2.2 Extend `NodeComponentProps` with an optional `previousScope?: BindingScope`, and update `renderChildren`/`RenderNode` so container nodes (Page/Row/Column/Stack/Section) pass `previousScope` through unchanged, mirroring how `scope` is already threaded
- [x] 2.3 Add `setDiffWrapper`/`getDiffWrapper` to `node-registry.tsx`, mirroring the existing `setEditableWrapper` pattern, so diff-rendering stays client-only and out of the server-only static-render path
- [x] 2.4 Implement a `DiffOverlay` component (in `registry/editable-overlay.tsx` or a sibling file) rendering the current value struck through in red immediately above the proposed value in green, registered via `setDiffWrapper` from `resume-canvas.tsx`
- [x] 2.5 Update `TextNode` (`registry/nodes/text-node.tsx`) to resolve its binding against both `scope` and `previousScope` in diff mode and delegate to the scalar-diff helper (1.1)
- [x] 2.6 Update `RichTextNode` to normalize both sides via the plain-text helper (1.2) before diffing in diff mode
- [x] 2.7 Update `ListNode` (`registry/nodes/list-node.tsx`) repeater path to use the positional-correspondence helper (1.3): render modified entries by recursing `itemTemplate` in diff mode with old/new item scopes, added entries as whole green blocks, removed entries as whole struck-through red blocks at their original index
- [x] 2.8 Update `ListNode` leaf path (skills) to use the nested skill-group helper (1.4), rendering added/removed chips within a matched group and whole added/removed groups
- [x] 2.9 Update `ResumeCanvas` (`render/resume-canvas.tsx`) to accept a `previousData: ResumeData` prop and `mode="diff"`, constructing the root `previousScope` alongside the existing root `scope`

## 3. Per-unit review state (client)

- [x] 3.1 Build a review-session hook/reducer holding one tri-state (`pending`/`accepted`/`rejected`) per unit id (1.5), scoped to one proposal
- [x] 3.2 Wire accept/reject controls into `DiffOverlay` for scalar-field units and into the repeater entry wrapper for list-entry units (including removed-entry blocks, which also need their own accept/reject)
- [x] 3.3 Add a "done reviewing" action, enabled regardless of how many units are still `pending` (per the "unresolved units treated as rejected" requirement)
- [x] 3.4 Wire the chat's `ProposalCard` to trigger entering canvas diff-review for its proposal (resolves the open design question on what starts diff mode)

## 4. Batched reconciliation and commit

- [x] 4.1 Implement the reconciliation function: for each unit, resolve its final value (accepted → proposed value; rejected/pending → current value, with removed-entry acceptance excluding the entry and added-entry rejection excluding it) per the "List field reconstruction from per-entry decisions" requirement
- [x] 4.2 Reconstruct each touched list field's full array from per-entry decisions, preserving the positional order used for display
- [x] 4.3 Fire exactly one `PATCH` via the existing `updateProfile` call with the reconciled object when "done reviewing" completes
- [x] 4.4 Build the grouped outcome payload (unit id → accepted/rejected) and send it as the single outcome message to `ai-server`

## 5. ai-server outcome contract

- [x] 5.1 Change `proposal_outcome`'s schema in `ai-server/src/agent/graph.py` from `{ proposal_id, approved: boolean }` to `{ proposal_id, decisions: [{ unit, status }] }`
- [x] 5.2 Update the agent's handling of the outcome (and relevant system-prompt text) so it can reference partially-accepted proposals in conversation
- [x] 5.3 Tighten the `propose_profile_update` system-prompt guidance to preserve existing entry order and only append/remove at the ends, bounding the risk of positional-correspondence misattribution

## 6. Chat/API type updates

- [x] 6.1 Update `ChatProposal`/`ChatProposalFieldDiff` in `app/src/components/basic/chat.tsx` (or introduce a unit-based type) to carry per-unit tri-state instead of one proposal-wide status
- [x] 6.2 Update `Proposal`/`AgentResponse` types in `app/src/apis/chat.ts` if the outcome payload shape requires new client-side types
- [x] 6.3 Update `profile-editor.tsx`'s `buildProposalDiff`/`handleApproveProposal`/`handleRejectProposal` to build/consume the new per-unit structures instead of whole-proposal approve/reject

## 7. Verification

- [x] 7.1 Add Storybook stories for `DiffOverlay` covering: unchanged scalar, changed scalar, changed rich-text, modified/added/removed list entries, and skill-group/chip diffs
- [x] 7.2 Add unit tests for the positional-correspondence helper (1.3/1.4) and the reconciliation function (4.1/4.2), covering the scenarios in both spec files
- [x] 7.3 Manually drive the full flow in a running app: trigger an agent proposal touching a scalar field, a rich-text description, and an experience list (mix of modify/add/remove), confirm the canvas diff renders correctly, confirm mixed accept/reject produces exactly one `PATCH` with the correctly reconciled data, and confirm the agent's next reply reflects the partial outcome
