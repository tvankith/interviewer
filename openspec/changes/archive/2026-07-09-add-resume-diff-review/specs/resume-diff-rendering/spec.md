## ADDED Requirements

### Requirement: Scalar field diff rendering
When the resume canvas renders in diff mode for a pending proposal, any `Text`-bound scalar field whose proposed value differs from its current value SHALL render the current value struck through in red immediately above the proposed value in green. A scalar field with no proposed change SHALL render normally, with no diff decoration.

#### Scenario: Changed scalar field
- **WHEN** the canvas renders in diff mode and a proposal changes `location` from "Bangalore" to "Remote"
- **THEN** the canvas shows "Bangalore" struck through in red directly above "Remote" in green, at that field's position in the resume layout

#### Scenario: Unchanged scalar field
- **WHEN** the canvas renders in diff mode and a proposal does not include `phone`
- **THEN** the canvas renders the current `phone` value with no strikethrough or diff decoration

### Requirement: Rich text field normalization before diffing
Rich-text-bound fields (e.g. `summary`, and `description` within experience/project/education entries) SHALL be converted to plain text on both the current (Lexical JSON) side and the proposed (plain text) side before being compared, so the diff never compares a serialized Lexical document against a plain string.

#### Scenario: Rich text field changed
- **WHEN** a proposal changes an experience entry's `description` and the stored value is a non-empty Lexical document
- **THEN** the canvas shows the current description's plain-text extraction struck through in red, with the proposed plain text in green below it

#### Scenario: Rich text field proposed but textually identical
- **WHEN** a proposal includes a `description` whose plain-text content, after normalization, exactly matches the current value's plain-text extraction
- **THEN** the canvas renders the field with no diff decoration

### Requirement: List entry diffing by positional correspondence
For list fields that are repeaters (`experiences`, `educations`, `projects`, `links`), the canvas SHALL pair the current array's entry at index i with the proposed array's entry at index i, SHALL render an index present only in the proposed array as an added entry (green, no strikethrough), SHALL render an index present only in the current array as a removed entry (red, fully struck through) at its original index position, and SHALL render an index present in both, with at least one differing field, as a modified entry with each changed field diffed per the scalar/rich-text rules above while unchanged fields render normally.

#### Scenario: Modified entry
- **WHEN** a proposal's `experiences[0]` changes `role` and `end_date` but leaves `company` and `location` unchanged
- **THEN** the canvas shows `role` and `end_date` with red-strike/green diff decoration, and `company`/`location` rendered normally, all within the same entry block at index 0

#### Scenario: Added entry
- **WHEN** the proposed `experiences` array has 3 entries and the current array has 2
- **THEN** the canvas renders the entry at index 2 as a whole new-entry block in green, with no corresponding struck-through entry

#### Scenario: Removed entry
- **WHEN** the proposed `experiences` array has 2 entries and the current array has 3, dropping the entry that was at index 1
- **THEN** the canvas renders the removed entry as a whole struck-through red block at index 1, in its original position relative to the surrounding (unchanged or modified) entries

### Requirement: Nested skill-group diffing
The `skills` field (an array of `{ category, skills: string[] }` groups) SHALL be diffed by first applying positional entry correspondence across the group array by index, and then, for each index present in both the current and proposed arrays, SHALL apply positional correspondence again across that group's `skills: string[]` chips.

#### Scenario: Chip added within a matched group
- **WHEN** a proposal's skill group at index 0 (category "Languages") has one additional string appended to `skills` compared to the current group at index 0
- **THEN** the canvas shows the existing chips unchanged and renders the new chip as an added (green) chip within that group

#### Scenario: Skill group added
- **WHEN** the proposed `skills` array has a group at an index beyond the current array's length
- **THEN** the canvas renders that entire group, including all its chips, as an added block in green

### Requirement: Diff mode is isolated from static and PDF rendering
Diff-mode rendering logic SHALL only run when the canvas's render mode is `"diff"`, and SHALL have no effect on `"interactive"` or `"static"` mode rendering, including the server-only static-render path used for PDF export.

#### Scenario: PDF export while a proposal is pending
- **WHEN** a candidate has an unreviewed pending proposal and downloads their resume as a PDF
- **THEN** the generated PDF reflects only the current (already-saved) resume data, with no diff decoration or proposed-but-unapproved content
