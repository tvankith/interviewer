## Why

Candidate skills are currently a flat `string[]` everywhere (profile editor, API payload, DB, resume parser, MCP
tool spec, PDF template), so a resume with "Languages: Python, Go" and "Cloud: AWS, GCP" collapses into one
undifferentiated chip list. The design system already has a categorized `SkillsBuilder`/`SkillCategory`
component, proven in the job-posting form (`primary_skills_by_category: Record<string, string[]>`), but the
candidate profile has never adopted it. Grouping candidate skills by category makes the rendered resume more
scannable and gives the interview agent structured signal (e.g. "ask about their cloud skills") instead of an
undifferentiated bag of strings.

## What Changes

- **BREAKING**: `CandidateProfile.skills` changes shape from `string[]` to an ordered list of skill groups
  (`{ category?: string; skills: string[] }[]`, matching the existing `SkillCategory` type) across the app,
  api-server, and the resume-parser's structured-output schema. `category` is optional per group, so a
  candidate can save plain, uncategorized skills (one or more groups with no `category`) alongside categorized
  ones — grouping is opt-in, never required. Any code reading `skills` as a flat array must be updated; there
  is no runtime migration for existing rows since the column is an untyped Prisma `Json` field — see design.md
  for the read-side fallback that lets old flat-array rows keep rendering instead of crashing.
- Profile editor's Skills section (`section-form-content.tsx`) switches from `ChipInput` to the existing
  `SkillsBuilder` component directly (no dict-conversion glue needed, unlike `job-form.tsx`'s
  `Record<string, string[]>` — see design.md for why the array shape was chosen instead).
- Resume rendering (`resume-engine`): the `skills-list` `List` node (bound flatly to `skills`, `display: "chip"`)
  is replaced with a grouped rendering (one heading + chip row per category) in both copies of
  `classic.template.json` (`app/src/resume-engine/templates/` and `api-server/prisma/data/`), plus whatever
  `node-registry.tsx` / `editable-overlay.tsx` changes are needed to make the new grouping editable in place.
- Resume parsing (`api-server/src/services/resume-parser.ts`, `schemas/parsed-resume.ts`): the Gemini structured
  extraction schema for an uploaded resume changes from `skills: string[]` to a categorized shape, and
  `profile-transformer.ts` maps the parsed result into the new `Record<string, string[]>` profile field.
- MCP contract (`api-server/src/routes/profile.ts` spec schema, `api-server/src/mcp`): the `get_profile_spec`
  JSON schema for `skills` changes from `stringArray` to an object-of-arrays shape so `ai-server`'s read-only
  tools return categorized skills to the interview agent. `mcp/tools/skills.ts` is already marked deprecated
  (no longer registered under the HITL model) and is out of scope beyond confirming it stays unregistered.

## Capabilities

### New Capabilities
- `skill-categories`: candidate profile skills as named categories (category → skill list), covering the data
  model, profile-editor UI, resume-parser extraction, MCP read exposure, and PDF template rendering.

### Modified Capabilities
(none — no existing `openspec/specs/` capabilities predate this change)

## Impact

- **app**: `apis/profile.ts` (`CandidateProfile.skills`), `profiles/profile/compose/types.ts`
  (`CandidateFormValues`/`CandidatePayload`), `profiles/helpers/map-form-to-profile-payload.ts` +
  `map-profile-to-form.ts`, `profiles/components/section-form-content.tsx`,
  `resume-engine/types/resume-data.ts` (`ResumeData.skills`), `resume-engine/templates/classic.template.json`,
  `resume-engine/registry/node-registry.tsx`, `resume-engine/registry/editable-overlay.tsx`.
- **api-server**: `schemas/parsed-resume.ts`, `services/resume-parser.ts`, `services/profile-transformer.ts`,
  `routes/profile.ts` (request schema + MCP spec schema), `prisma/data/classic.template.json`. No Prisma schema
  migration needed (`candidate_profile.skills` is already `Json?`).
- **ai-server**: no code change expected — it consumes `get_profile_spec`/`get_candidate_profile` output
  as-is, but its prompt/tool-usage assumptions about `skills` being a flat list should be reviewed.
- Existing candidate rows with a flat `skills: string[]` in the DB must not break: the editor and renderer need
  a read-side fallback (treated as an "Uncategorized" bucket) until re-saved in the new shape.
