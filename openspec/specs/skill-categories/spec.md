# skill-categories

## Purpose

Lets candidates organize their profile's skills into labeled categories (e.g. "Languages", "Cloud") instead of a
single flat list, across storage, the profile editor, resume parsing, the interview agent's read-only profile
tools, and the rendered resume.

## Requirements

### Requirement: Candidate skills are stored as an ordered list of skill groups
The system SHALL store `candidate_profile.skills` as an ordered array of skill groups, each with an optional
`category` label and a list of skill names (`{ category?: string; skills: string[] }[]`), replacing the flat
`string[]` shape.

#### Scenario: Saving categorized skills
- **WHEN** a candidate saves a profile with skill groups `[{ category: "Languages", skills: ["Python", "Go"] }, { category: "Cloud", skills: ["AWS"] }]`
- **THEN** the profile is persisted with both groups, in the order provided, and reloading the profile returns the same groups in the same order

#### Scenario: Saving skills with no category
- **WHEN** a candidate saves a profile with a skill group that has no `category` set, e.g. `[{ skills: ["Excel", "SQL"] }]`
- **THEN** the profile is persisted and reloaded with that group's `category` absent (not defaulted to a placeholder string like "Uncategorized") and its skills intact

#### Scenario: Saving a mix of categorized and uncategorized groups
- **WHEN** a candidate saves `[{ category: "Languages", skills: ["Python"] }, { skills: ["Communication"] }]`
- **THEN** both groups are persisted independently, one with a category and one without, and neither overwrites the other

### Requirement: Profile editor lets candidates group skills by category or leave them ungrouped
The profile editor's Skills section SHALL let a candidate add one or more skill groups, each with an optional
category label and its own list of skill chips, using the existing `SkillsBuilder` component.

#### Scenario: Adding a new category group
- **WHEN** a candidate clicks "+ Add Category" in the Skills section and enters a category name and at least one skill
- **THEN** a new skill group appears in the form state with that category and skill, ready to be saved

#### Scenario: Adding skills without picking a category
- **WHEN** a candidate adds a skill group and leaves the category field blank
- **THEN** the group is still valid and saveable, and is not blocked or auto-filled with a required category value

### Requirement: Legacy flat skill lists are read without data loss
The system SHALL treat a `skills` value stored as a flat `string[]` (the pre-existing shape) as a single
uncategorized skill group when read, without requiring a database migration or losing any skill names.

#### Scenario: Loading a profile saved before this change
- **WHEN** a candidate profile's `skills` column contains `["Python", "React"]` (flat array, legacy shape)
- **THEN** the profile editor and resume renderer both treat it as one skill group with no category and skills `["Python", "React"]`

#### Scenario: Missing or null skills
- **WHEN** a candidate profile's `skills` column is `null` or absent
- **THEN** the system treats it as an empty list of skill groups, not an error

### Requirement: Resume parsing extracts skills as groups
The resume-parser's structured-output extraction (from an uploaded PDF/DOCX) SHALL produce skills as a list of
groups with optional categories, inferring a category from the source resume's section structure when present
and falling back to a single uncategorized group when the resume lists skills without categorization.

#### Scenario: Uploaded resume has categorized skill sections
- **WHEN** an uploaded resume has a "Technical Skills" section with sub-labels like "Languages: Python, Go" and "Cloud: AWS, GCP"
- **THEN** the parsed result includes a skill group with category "Languages" and skills `["Python", "Go"]`, and a separate group with category "Cloud" and skills `["AWS", "GCP"]`

#### Scenario: Uploaded resume lists skills flatly
- **WHEN** an uploaded resume has a "Skills" section listing skills with no sub-categorization, e.g. "Python, React, SQL"
- **THEN** the parsed result includes a single skill group with no category and skills `["Python", "React", "SQL"]`

### Requirement: The interview agent's read-only profile tools expose categorized skills
The `get_profile_spec`/`get_candidate_profile` MCP tools SHALL return `skills` as a list of groups (category +
skill names) rather than a flat string array, matching the stored shape.

#### Scenario: Agent reads a candidate's categorized skills
- **WHEN** the interview agent calls `get_candidate_profile` for a candidate whose skills include a "Cloud" group with `["AWS", "GCP"]`
- **THEN** the tool response includes that group's category and skill names, structured as an object with `category` and `skills` fields rather than bare strings

### Requirement: The rendered resume displays skills grouped by category
The PDF/preview resume template SHALL render each skill group as its own labeled section (category heading,
omitted when the group has no category) followed by that group's skills, rather than a single flat chip list.

#### Scenario: Rendering categorized skill groups
- **WHEN** a resume's skills are `[{ category: "Languages", skills: ["Python", "Go"] }, { category: "Cloud", skills: ["AWS"] }]`
- **THEN** the rendered resume shows a "Languages" heading with "Python" and "Go" chips, followed by a "Cloud" heading with an "AWS" chip

#### Scenario: Rendering an uncategorized skill group
- **WHEN** a resume's skills include a group with no `category` and skills `["Excel"]`
- **THEN** the rendered resume shows that group's skill chips without a blank or placeholder heading above them

#### Scenario: Editing skills inline in the resume preview
- **WHEN** a candidate uses the resume preview's inline editing to add a new skill to an existing group, or add a new group
- **THEN** the change is written back to the correct group in the candidate's `skills` data via the same click-to-edit mechanism used by other repeated sections (e.g. experience, education)
