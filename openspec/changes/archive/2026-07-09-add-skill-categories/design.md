## Context

`candidate_profile.skills` is a Prisma `Json?` column with no schema enforcement at the DB layer; every
consumer (app types, api-server zod schemas, the resume-parser's Gemini structured-output schema, the MCP
`get_profile_spec` JSON schema, and the `classic.template.json` PDF template) independently assumes it's a flat
`string[]`. The job-posting form already solved a near-identical problem — grouping skills by category — using
a `Record<string, string[]>` dict (`primary_skills_by_category`) plus a `SkillCategory[]` array
(`{ category?: string; skills: string[] }`) as the UI-facing shape, converted to/from the dict at the
form-submit/hydrate boundary via `Object.entries`/`reduce`. `SkillsBuilder` (`components/basic/skill-builder.tsx`)
already renders `SkillCategory[]` with an optional `category` field per group.

## Goals / Non-Goals

**Goals:**
- Let a candidate group skills under named categories (e.g. "Languages", "Cloud") in the profile editor.
- Let a candidate save skills with **no** category at all — grouping is optional, not mandatory. A profile with
  zero categorization must remain a first-class, fully supported state, not a degraded fallback.
- Extend categorization through resume parsing (upload → LLM extraction), MCP exposure to the interview agent,
  and PDF rendering, so the shape is consistent everywhere `skills` is read or written.
- Keep existing candidate rows (flat `string[]`) rendering and editable without a forced migration step.

**Non-Goals:**
- No DB migration / backfill script — `skills` stays `Json?`; old rows are handled by a read-side
  normalizer, not rewritten in place until the candidate next saves.
- No skill-category taxonomy or autocomplete (e.g. suggesting "Languages" as a canonical category name) —
  category is a free-text label, same as `job-form.tsx`'s today.
- No change to `mcp/tools/skills.ts` beyond confirming it stays unregistered (already dead code under HITL).

## Decisions

**1. Canonical shape: `SkillGroup[]` (array), not `Record<string, string[]>` (dict).**
`type SkillGroup = { category?: string; skills: string[] }`, reusing the existing `SkillCategory` type from
`components/basic/skill-builder.tsx` verbatim (rename call sites to `SkillGroup` for clarity now that it's used
outside job postings — pure rename in TS, no behavioral change).
- *Why over the dict shape job-form uses*: a dict requires unique, non-empty keys, so "uncategorized" skills
  need a magic key (`""` or `"Uncategorized"`) and two separate uncategorized groups collide into one. An array
  of `{ category?, skills }` lets `category` be genuinely absent, lets multiple uncategorized groups coexist if
  a candidate wants that, and preserves the order the candidate entered groups in (dicts don't guarantee this
  across JSON serialization boundaries in the same way). It also means the profile editor needs **no**
  dict⇄array conversion glue — `SkillsBuilder`'s value can be passed straight to `setValue("skills", ...)`.
- *Why not extend `List`'s existing repeater mode instead of a dedicated render path*: `List`'s `itemTemplate`
  repeater already iterates an array and could in principle render one `itemTemplate` per `SkillGroup`, with a
  nested `List` (chip display) for that group's `skills`. This is the chosen approach for the template (see
  Decision 3) — no new `NodeType` needed, `List` nested inside `List` covers it.

**2. Read-side fallback for legacy flat-array rows, not a migration.**
A shared normalizer (`toSkillGroups(raw: unknown): SkillGroup[]`) lives once in a shared location the app and
api-server can both reach (or is duplicated — TS project boundary between `app` and `api-server` means no
shared package today; duplicate the ~5-line function in both, matching how other cross-service assumptions
already tolerate duplication in this repo) and is applied wherever `skills` is read from Prisma/the API:
- `string[]` (legacy) → `[{ skills: raw }]` (single uncategorized group, only if non-empty).
- `SkillGroup[]` (new shape) → passed through as-is (with light defensive filtering of malformed entries).
- `null`/`undefined`/anything else → `[]`.
Writes always persist the new shape; a legacy row is only rewritten once the candidate next saves the profile
(no batch backfill job).

**3. Template rendering: `List` repeater whose `itemTemplate` is itself a `List` with a `prefixBinding` label,
not a new `NodeType`, not a `Row`-wrapped heading+chip-block.**
`skills-list`'s current binding (`List`, `binding: "skills"`, `display: "chip"`) becomes a `List` in repeater
mode (`itemTemplate`) bound to `skills`, where each `itemTemplate` is *itself* a leaf `List` (`display: "chip"`,
`binding: "skills"` relative to that repeater item) with a new generic `ListNodeProps.prefixBinding: "category"`
/ `prefixSuffix: ":"`. `list-node.tsx` resolves `prefixBinding` against the same scope as the array binding and
renders it as the *first item inside the same single `flex flex-wrap` container* as the chips — not a sibling
block next to a separately-wrapping chip container — so continuation lines start flush at the left edge with no
blank gutter under the label, and the label itself is pinned with `whiteSpace: "nowrap"` / `flexShrink: 0` so a
multi-word category (e.g. `"AI/LLM Technologies"`) can never split across lines. This iterated twice on user
feedback: first from a stacked heading+chip block to inline `display: "comma"` text, then back to
`display: "chip"` pills (to keep category and skills visually distinct), then from a `Row`-wraps-[`Text`,
`List`] structure (which had the label-wrap/gutter bugs) to this single-container `prefixBinding` approach —
confirmed via `/api/resume/render-html` with a long multi-word category forcing a wrap. `prefixBinding` is a
generic, reusable addition to `ListNodeProps`/`list-node.tsx` (not skills-specific) rather than a one-off
mechanism. `resolveBinding`/`toAbsoluteBinding` already support relative bindings inside a repeater scope
(`BindingScope.absolutePath`) — confirmed via the same nesting pattern already used by `experience`/`education`.
Both `classic.template.json` copies (`app/src/resume-engine/templates/`, `api-server/prisma/data/`) get the
same change, **and both must be re-seeded into the DB** (`npm run db:seed`) for the change to reach real
candidate profiles — see Migration Plan point 4. Adding a skill within a group is edited as a whole array via
the existing click-to-edit + `ChipInput` popover (same mechanism `tech_stack` chip lists already use for
`editable.editable` on a leaf `List`) rather than a per-chip "+ Add" button, since chip-style add controls only
exist for repeater lists (`itemTemplate`) in `list-node.tsx`, not leaf arrays — no `editable-overlay.tsx` change
needed. Adding/removing a whole group reuses the repeater `AddItemButton`/`RepeaterItemWrapper` controls
already used by experience/education.

**4. Resume-parser LLM schema: skills extracted directly as `SkillGroup[]`.**
`llmParsedResumeSchema.skills` moves from `z.array(z.string())` to
`z.array(z.object({ category: z.string().optional(), skills: z.array(z.string()) }))`, prompting Gemini to
infer categories from resume section headers (e.g. "Technical Skills: Languages — Python, Go") when present,
and falling back to a single uncategorized group when the source resume just lists skills flatly. `Gemini`'s
structured-output constraint (no `anyOf`/`oneOf`, called out in the existing schema comment) is respected since
`.optional()` on a plain string still lowers to a simple JSON Schema type, same pattern already used elsewhere
in that file. `parsedResumeSchema` (wire/storage schema) mirrors this with `.nullable().default(null)` on
`category` per the file's existing convention for optional strings.

**5. MCP `get_profile_spec` schema: object array, not `stringArray`.**
`routes/profile.ts`'s spec schema for `skills` (currently `stringArray` at line ~67) becomes
`{ type: 'array', items: { type: 'object', properties: { category: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } } } } }`, matching the `links` field's existing object-array pattern in the same
file. `ai-server`'s agent prompt is not changed in this PR — categorized skills degrade gracefully into the same
"list of skills" context the agent already reasons over, just with more structure available if the prompt is
later updated to use it.

## Risks / Trade-offs

- [Duplicated `toSkillGroups` normalizer between `app` and `api-server`] → Keep it tiny (~5 lines) and covered
  by a unit test in `api-server` (colocated per repo convention) plus a Storybook/story-level check in `app`;
  drift risk is low given the function's small surface.
- [Existing candidates see their skills silently re-bucketed as a single "uncategorized" group on next
  render] → This is the intended, lossless fallback (Decision 2) — no data is dropped, just re-shaped;
  worth a one-line callout in the PR description so reviewers don't mistake it for a bug.
- [Gemini may inconsistently infer categories from ambiguous resumes] → Falls back to one uncategorized group
  per Decision 4, which is exactly today's flat behavior — no regression, only additive when categorization is
  confidently extractable.
- [`ai-server`/interview agent currently assumes `skills` is a flat list wherever it reasons about it in
  prompts] → Out of scope per Non-Goals, but flagged in proposal.md's Impact section for follow-up.

## Migration Plan

1. Ship type + schema changes (app, api-server, MCP spec) together, since `skills` flows through all of them in
   one request/response cycle — a partial rollout would have one side sending the old shape to a side expecting
   the new one.
2. Read-side normalizer ships in the same PR so legacy rows don't break immediately after deploy.
3. No feature flag: this is a Json-typed field with a backward-compatible read path, so old and new shapes can
   coexist in the table indefinitely; rollback is a plain revert (no destructive DB change to undo).
4. `classic.template.json` is not read live from disk by the running app — `api-server/prisma/seed.ts` upserts
   its contents into the `resume_template` row (`id: 'tpl-classic-v1'`) at seed time, and the app fetches
   templates from that DB row via `GET /api/resume-templates`. Any edit to either `classic.template.json` copy
   (they must stay identical) needs `npm run db:seed` (`docker compose exec api-server npm run db:seed`)
   re-run before it's visible on a real candidate's resume preview/PDF — confirmed during this change: a
   template fix was invisible in the running app until the reseed, even though the file and the direct
   `/api/resume/render-html` test (which takes `templateDoc` in the request body, bypassing the DB) already
   showed it working.

## Open Questions

- Should `Text` nodes' existing "hide when binding resolves empty" behavior be confirmed (not assumed) before
  relying on it to hide an empty `category` heading in the template — needs a quick check against
  `node-registry.tsx`'s `Text` renderer during implementation (tasks.md should include this as a verification
  step, not a research spike).
