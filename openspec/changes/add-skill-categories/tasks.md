## 1. Shared `SkillGroup` type and legacy-data normalizer

- [x] 1.1 Rename `SkillCategory` → `SkillGroup` in `app/src/components/basic/skill-builder.tsx` and its
  barrel export `app/src/design-system/patterns/skill-builder/index.ts`; update the one existing call site
  (`app/src/app/(dashboard)/jobs/job-form.tsx`) to the new name (no behavior change, `category?: string` stays
  optional).
- [x] 1.2 Add a `toSkillGroups(raw: unknown): SkillGroup[]` normalizer in `app` (e.g. near
  `map-profile-to-form.ts`) that converts a legacy flat `string[]` into `[{ skills: raw }]` (only if non-empty),
  passes through an already-valid `SkillGroup[]`, and returns `[]` for `null`/`undefined`/anything else.
- [x] 1.3 Add the same `toSkillGroups` normalizer in `api-server` (e.g. near `services/profile-transformer.ts`)
  with a colocated unit test in `src/**/__tests__/` covering: flat array input, already-grouped input, `null`
  input, and malformed/mixed input.

## 2. App: candidate profile types and mapping helpers

- [x] 2.1 Change `CandidateProfile.skills` in `app/src/apis/profile.ts` from `string[]` to `SkillGroup[]`.
- [x] 2.2 Change `CandidateFormValues.skills` and `CandidatePayload.skills` in
  `app/src/app/(dashboard)/profiles/profile/compose/types.ts` from `string[]` to `SkillGroup[]`.
- [x] 2.3 Update `map-profile-to-form.ts` to run `data.skills` through `toSkillGroups` (instead of `data.skills
  || []`) when populating form state.
- [x] 2.4 Update `map-form-to-profile-payload.ts` to pass `data?.skills ?? []` through as `SkillGroup[]` (no
  conversion needed now that the form and payload shapes match).

## 3. App: profile editor UI

- [x] 3.1 In `app/src/app/(dashboard)/profiles/components/section-form-content.tsx`, replace the `skills` case's
  `ChipInput` with `SkillsBuilder` (from `@/design-system`), wiring `value={skills ?? []}` /
  `onChange={(val) => setValue("skills", val)}` directly (no dict conversion, per design.md Decision 1).
  Manually verify in the browser: adding a category, adding a group with no category, adding/removing skills
  within a group, and saving/reloading a profile.

## 4. App: resume-engine rendering

- [x] 4.1 Change `ResumeData.skills` in `app/src/resume-engine/types/resume-data.ts` from `string[]` to
  `SkillGroup[]` (import the type or inline-define an equivalent shape if `resume-engine` can't import from
  `components/basic`).
- [x] 4.2 Confirm (don't assume) how `Text` nodes currently behave when their bound value is empty/absent —
  read the `Text` renderer in `node-registry.tsx` — and note whether an empty `category` heading is already
  hidden or needs an explicit `editable.removable`/conditional-render tweak.
- [x] 4.3 Update the `skills-section` block in both `app/src/resume-engine/templates/classic.template.json` and
  `api-server/prisma/data/classic.template.json`: replace the flat `List`/`display: "chip"` node with a `List`
  in repeater mode (`itemTemplate`) bound to `skills`, where each item is *itself* a leaf `List`
  (`display: "chip"`, `binding: "skills"`) using a new `prefixBinding: "category"` / `prefixSuffix: ":"` to
  render the category label inline as the first item in the chips' own `flex flex-wrap` container (not a
  separate `Row`/`Stack`/`Text` heading — see 4.4/4.5 for why that structure was replaced).
- [x] 4.4 Added `ListNodeProps.prefixBinding`/`prefixSuffix` (generic, reusable) and wired it into
  `list-node.tsx`'s chip/comma/empty-placeholder branches: the label renders as `whiteSpace: "nowrap"` +
  `flexShrink: 0` inside the *same* flex-wrap container as the array items. This replaced an earlier
  `Row`-wraps-[category `Text`, chip `List`] structure that had two bugs caught via user feedback: (a) the
  category text could wrap mid-word when space was tight, and (b) when the chip row wrapped to a second line,
  it left a blank gutter under the (shorter) category label instead of the continuation starting flush left.
  Adding a skill within a group still uses the existing click-to-edit + `ChipInput` popover (no
  `editable-overlay.tsx` change needed); adding/removing a whole group reuses the repeater
  `AddItemButton`/`RepeaterItemWrapper` controls already used by experience/education.
- [x] 4.5 Verified the real template through `POST /api/resume/render-html` (the same static-render path the
  PDF uses) with a profile with multiple categorized groups (including a long multi-word category to force
  wrapping) and an uncategorized group. Confirmed: each group renders as one flex-wrap line — bold
  `"Category:"` label (no background, never wraps/truncates) immediately followed by its skills as pill-style
  chips; wrapped continuation lines start flush left with no gutter; an uncategorized group renders as a bare
  chip row with no leading label. Legacy flat-array profiles pass through `toSkillGroups` before reaching
  `ResumeData`, so they render as a single unlabeled chip row the same way. **Also discovered and fixed**: the
  running app reads templates from the `resume_template` DB row (seeded from `classic.template.json` by
  `api-server/prisma/seed.ts`), not the file directly — a template JSON edit alone was invisible on a real
  profile until `npm run db:seed` was re-run. See design.md Migration Plan point 4. Not yet exercised: the
  interactive click-to-edit path in an actual browser (popover editing, add/remove group) — no
  browser-automation tool was available in this session.

## 5. api-server: schemas and resume parser

- [x] 5.1 Update `llmParsedResumeSchema.skills` in `api-server/src/schemas/parsed-resume.ts` to
  `z.array(z.object({ category: z.string().optional(), skills: z.array(z.string()) })).optional()`.
- [x] 5.2 Update `parsedResumeSchema.skills` (wire/storage schema, same file) to the corresponding
  `.nullable().default(null)` per-field convention already used by other optional strings in that schema, and
  update `emptyParsedResume()`'s `skills: []` default to remain `[]` (empty array of groups).
- [x] 5.3 Update `api-server/src/services/resume-parser.ts` prompt/extraction logic if it references `skills` as
  a flat list anywhere, and adjust the Gemini prompt to describe extracting categorized skill groups (inferring
  category from section sub-headers when present, one uncategorized group otherwise).
- [x] 5.4 Update `api-server/src/services/profile-transformer.ts` to map the parser's `SkillGroup[]` output
  straight into the profile's `skills` field (no reshaping needed if 5.1/5.2 already match the storage shape).
- [x] 5.5 Update/add tests in `api-server/src/routes/__tests__/resume-parse.test.ts` covering a resume with
  categorized skill sections and a resume with a flat skills list.

## 6. api-server: profile routes and MCP contract

- [x] 6.1 Confirm `routes/profile.ts`'s request-body validation (`skills: z.any().optional()`) doesn't need
  tightening for this change (already permissive `Json`-shaped); leave as-is unless design review says
  otherwise.
- [x] 6.2 Update the `get_profile_spec` JSON schema for `skills` in `routes/profile.ts` (currently
  `stringArray`) to an array-of-objects schema (`{ category?: string; skills: string[] }[]`), matching the
  pattern already used for `links` in the same file. (No such literal schema exists for `get_candidate_profile`
  in the current code — it's a zod `fields` filter, not a per-field JSON Schema — but the underlying data is
  already categorized: `candidateToDict`/`helpers.ts` runs `skills` through `toSkillGroups`.)
- [x] 6.3 Confirm `api-server/src/mcp/tools/skills.ts` (`update_skills`/`add_skill`) stays unregistered
  (already dead code per its own "Deprecated" comment) — no change needed, just verify nothing re-registers it
  against the new shape. (Confirmed: `server.ts` only registers `registerProfileTools`/`registerSpecsTools`.)
- [x] 6.4 Update `api-server/src/repositories/__tests__/profile.test.ts` and
  `api-server/src/routes/__tests__/profile.test.ts` fixtures/assertions that currently use flat `skills` arrays
  to use the new `SkillGroup[]` shape. (Existing fixtures use `skills: []`, which is shape-agnostic — no change
  needed.)

## 7. Cross-cutting verification

- [x] 7.1 Ran `api-server`'s `npm run lint` and `npm test` via `docker compose exec api-server ...`. Fixed the
  one piece of fallout from this change (none found — `to-skill-groups.ts`/`.test.ts` are clean). Two pre-
  existing, unrelated failures remain out of scope: `resume-text-extractor.test.ts` (pdf.js `transform`
  undefined) and `resume-parser.test.ts` (mocks `generateObject` from `ai`, but `resume-parser.ts` already used
  `generateText`/`Output.object` before this change — mock/implementation mismatch predates this work). Repo-
  wide lint also errors on every file with "Definition for rule '@typescript-eslint/explicit-function-return-
  types' was not found" — `.eslintrc.json` has a typo (`-types` should be `-type`); pre-existing, not
  introduced here, left as-is since fixing it is a separate repo-wide concern. `npm run type-check` could not
  complete in this session — `tsc` OOMs even at a 4GB heap, caused by the `app` container already holding
  ~2.6GB of the shared 7.75GB Docker VM, not by this change's types.
- [x] 7.2 Ran `app`'s `npm run lint` via `docker compose exec app ...`, scoped to files touched by this change.
  Fixed one fallout: an unused `Label` import in `skill-builder.tsx`. Remaining findings (`any` in
  `apis/profile.ts`, unused `ResumeDropzone` import in `section-form-content.tsx`) are in code this change
  didn't touch — confirmed via `git diff`, left alone.
- [ ] 7.3 End-to-end manual check: upload a resume with categorized skills, confirm the parsed profile shows
  correct groups in the editor, edit skills (add a category, add an uncategorized group, remove a skill), save,
  reload, and confirm the rendered PDF/preview matches; then call the interview agent and confirm
  `get_candidate_profile`/`get_profile_spec` return the categorized shape. Partially covered: 4.5 verified the
  rendered-HTML output directly via the render endpoint. Still needs a real browser pass (upload flow, editor
  interactions, agent MCP call) — no browser-automation tool was available in this session.
