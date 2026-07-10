## ADDED Requirements

### Requirement: Per-unit tri-state decision tracking
While a proposal is under review, the system SHALL track an independent tri-state decision (`pending` | `accepted` | `rejected`) for each review unit: one unit per top-level scalar field the proposal touches, and one unit per list entry (added, modified, or removed) the proposal touches. Decisions on one unit SHALL NOT affect the tri-state of any other unit in the same proposal.

#### Scenario: Independent decisions across a proposal
- **WHEN** a proposal changes both `location` and `experiences[0]`
- **THEN** the candidate can mark `location` accepted while leaving `experiences[0]` pending, and each unit's state is tracked and displayed independently

### Requirement: Whole-entry granularity within a modified list entry
When a single list entry has multiple changed fields, the review unit SHALL be the entry as a whole, and the candidate SHALL NOT be able to independently accept one field and reject another field within the same entry.

#### Scenario: Multi-field entry accepted as one unit
- **WHEN** `experiences[0]` has both `role` and `end_date` changed, and the candidate accepts that entry's unit
- **THEN** both `role` and `end_date` are applied together; there is no way to accept only one of the two fields within that entry

### Requirement: Batched reconciliation into a single write
Individual accept/reject decisions SHALL NOT trigger any write to the backend, and only an explicit "done reviewing" action SHALL reconcile all of a proposal's decisions and issue exactly one `PATCH` request to persist the result.

#### Scenario: No writes during review
- **WHEN** a candidate accepts three units and rejects one unit while reviewing a proposal, without finishing the review
- **THEN** no `PATCH` request has been sent, and the candidate's live resume data on the backend is unchanged

#### Scenario: Single write on completion
- **WHEN** a candidate finishes reviewing a proposal with a mix of accepted, rejected, and pending units
- **THEN** exactly one `PATCH /api/profile/:id` request is issued, containing the reconciled result of every unit's final decision

### Requirement: List field reconstruction from per-entry decisions
When reconciling a list field that has at least one accepted entry-unit, the system SHALL reconstruct the full array by, at each index used for display correspondence, including the proposed entry if its unit was accepted, including the current entry if its unit was rejected or left pending (including a removal unit that was rejected, meaning the entry is kept), and omitting the entry entirely if an added-entry unit was rejected or a removed-entry unit was accepted.

#### Scenario: Partial acceptance within one list field
- **WHEN** a proposal modifies `experiences[0]`, adds `experiences[2]`, and removes what was `experiences[1]`, and the candidate accepts the modification and the addition but rejects the removal
- **THEN** the reconciled `experiences` array sent in the `PATCH` body contains the modified entry at index 0, the original (kept) entry that was at index 1, and the newly added entry

### Requirement: Unresolved units are treated as rejected at reconciliation
A review unit still in the `pending` state when the candidate finishes reviewing SHALL be reconciled as if it were rejected, so its current value is retained and its proposed value is discarded.

#### Scenario: Finishing review with an untouched unit
- **WHEN** a candidate finishes reviewing a proposal without ever setting a decision on one of its units (e.g. a changed `title` field)
- **THEN** that field's current value is retained in the reconciled result, unchanged by the proposal

### Requirement: Per-unit outcome reporting to the agent
After the reconciled `PATCH` succeeds, the system SHALL send exactly one outcome message back to the agent containing the final `accepted` or `rejected` status of every unit in the proposal, keyed consistently with how units were tracked during review.

#### Scenario: Agent informed of partial acceptance
- **WHEN** a candidate accepts two units and rejects one unit in a proposal, then finishes reviewing
- **THEN** the agent receives one outcome message listing all three units and each one's final accepted/rejected status
