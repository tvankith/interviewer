# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`app` is the Next.js 16 (App Router, React 19, TypeScript, Tailwind v4) frontend for the AI interview
platform described in the repo-root `CLAUDE.md`. It talks to two backend services: `api-server`
(auth, profiles/resumes, most CRUD) through a same-origin proxy, and `ai-server` (the interview agent)
directly from the browser. See the repo-root `CLAUDE.md` for the full service map — this file only
covers `app`-internal structure.

**Note on `app/.claude/FOLDER-STRUCTURE.md`, `PATTERNS.md`, `RULES.md`:** these predate this file and
are stale in places confirmed below (they list a `src/store/` Zustand store, a `(dashboard)/interviews`
route, and `RULES.md` includes an "never write Alembic migration" rule left over from the old Python
`server` service — none of which apply to `app`). Prefer this file.

## Commands

```bash
npm install && npm run dev      # dev server, Turbopack, :3000
npm run build                   # production build
npm run lint                    # eslint (flat config: eslint-config-next + eslint-plugin-storybook)
npm run storybook                # Storybook on :6006
npm run build-storybook
```

Tests run through Vitest in two separate projects (`vitest.config.ts`), not `npm test`:
- **`unit`** — plain Node-environment tests for pure logic, `src/**/*.test.ts`. Colocated with the code
  they test (e.g. `src/resume-engine/pagination/pack-units.test.ts`).
- **`storybook`** — runs each `*.stories.tsx`'s play function in a real headless Chromium via
  `@storybook/addon-vitest` + `@vitest/browser-playwright`.

```bash
npx vitest run src/resume-engine/pagination/pack-units.test.ts   # single unit test file
npx vitest run --project unit                                     # all pure-logic tests
npx vitest run --project storybook                                 # all story play-function tests
```

## Auth

Supabase is used only to drive the Google OAuth handshake (`lib/supabase/client.ts`, PKCE,
`detectSessionInUrl: false`) — the app's real session is two httpOnly cookies (`access_token`,
`refresh_token`) issued by `api-server`, not a Supabase session:

1. `(auth)/signin` → Supabase OAuth → `src/app/auth/callback/page.tsx` exchanges the PKCE code
   client-side, then POSTs the tokens to `POST /api/auth/callback`.
2. That route forwards the tokens to `api-server` for validation/sync, then sets the two cookies.
3. Root `proxy.ts` (Next 16's `middleware.ts` replacement) gates a hardcoded route allowlist on
   `access_token` cookie *presence only* (no signature check) — `/analytics` is in the redirect
   allowlist but missing from `proxy.ts`'s own `config.matcher`, so it's currently reachable
   unauthenticated. Verify before relying on `proxy.ts` to gate a new route.
4. Components read auth state via `hooks/use-auth.ts` (react-query wrapping `GET /api/auth/me`), not by
   reading the cookie or Supabase client directly.

## Backend integration — three axios instances, pick the right one

- **`apis/axios-instances.ts`: `axiosInstance`** — same-origin, `withCredentials: true`, hits
  `app/src/app/api/[...path]/route.ts`, which forwards to `api-server` (`API_SERVER_URL`), swaps the
  cookie for an `Authorization: Bearer` header, and does proactive + reactive (on `TOKEN_EXPIRED`)
  refresh with a single retry. Use this for anything that should go through `api-server`. (The
  `BACKEND_URL` env var declared in `next.config.ts` is dead — nothing reads it; the proxy route reads
  `API_SERVER_URL`.)
- **`apis/axios-instances.ts`: `aiServerAxiosInstance`** — calls `ai-server` directly from the browser
  (`NEXT_PUBLIC_AI_SERVER_URL`), bypassing the proxy. Auth is a short-lived bearer token
  (`lib/ai-server-token.ts`, cached in `sessionStorage`, minted via `POST /api/ai-server/token` which
  itself goes through the api-server proxy to re-validate the session cookie). Currently used only by
  `apis/chat.ts`'s `sendAgentMessage()` (the resume-editing assistant in `profile-editor.tsx`) — the
  interview Q&A chat (`session/[session_id]`) goes through `axiosInstance` instead
  (`sendChat()` → `/api/agent/chat` → api-server), so don't assume "chat" always means ai-server.
- **`lib/backend.ts`: `serverApi`** — server-only (`"use server"`), for Server Components/Actions; reads
  cookies via `next/headers`, same refresh-and-retry pattern as the proxy route. `apis/profile.ts` is
  the one client-side API file that also calls this directly.

There's no Vercel AI SDK runtime usage (`useChat`/`useCompletion`) anywhere — the `ai` package is only
used for its TypeScript types in `components/ai-elements/*`. All chat/agent UIs are react-query
`useMutation` + manual `invalidateQueries` (request/response), not streaming.

## resume-engine (`src/resume-engine/`)

A JSON-driven template renderer, not a hardcoded resume layout — `templates/classic.template.json`
(node tree) + `classic.theme.json` (colors/spacing/page size) fully describe what renders.
`registry/node-registry.tsx`'s `RenderNode`/`renderChildren` are the single render pipeline, dispatching
by `TemplateNode.type` to components in `registry/nodes/*` (Section, List, Stack, Text, RichText, ...).

**This pipeline is shared by two different consumers and that's the source of most of its design
constraints:**
- The **interactive/diff preview** (`render/resume-canvas.tsx`, client-only) — click-to-edit overlays
  (`registry/editable-overlay.tsx`) and HITL diff/accept-reject decoration
  (`registry/diff-overlay.tsx`) are injected into the otherwise-framework-agnostic `node-registry.tsx`
  via `setEditableWrapper`/`setDiffWrapper`/etc., called *only* from `resume-canvas.tsx`. The preview
  also does real client-side pagination into fixed A4 pages (`render/paginated-resume.tsx` +
  `pagination/*` + `render/hidden-measurement-pass.tsx`) — entries in a repeater section
  (Experience/Education/Projects, marked via `SectionNodeProps.avoidBreak: false`) never split
  mid-entry across a page boundary, matching the print behavior below.
- The **PDF export path** (`render/render-static-html.ts`) server-renders the same template via
  `ReactDOMServer.renderToStaticMarkup` to a standalone HTML string (posted to `/api/lexical/pdf`,
  turned into a PDF outside this repo). It has **no Tailwind stylesheet** — `theme/resolve-theme.ts`'s
  `themeToCssText()` hand-rolls plain-CSS equivalents for every Tailwind utility class the node
  components/template reference, plus a CSS reset and the `@media print` /
  `page-break-inside: avoid` rule that gives the PDF its own (server-side, CSS-native) pagination.

**Two invariants to preserve when touching this code:**
1. `registry/node-registry.tsx`, `registry/nodes/*`, and `render/render-static-html.ts` must stay free
   of client-only imports (Radix, Lexical's React hooks) — `render-static-html.ts` runs
   `ReactDOMServer.renderToStaticMarkup` on them. Client-only behavior is injected via the
   `setEditableWrapper`/`setListControls`/`setDiffWrapper`/`setDiffEntryWrapper` functions, called only
   from `resume-canvas.tsx`.
2. Anything added to `themeToCssText()`'s Tailwind allowlist is easy to forget — a class used in a node
   component or `classic.template.json` that isn't mirrored there renders fine in the (real-Tailwind)
   preview and silently does nothing in the PDF. There's no automated check for this yet.

`api-server/prisma/data/classic.template.json` / `classic.theme.json` are a **separate, manually
synced copy** used only to seed the `resume_template` DB table (`api-server/prisma/seed.ts`) — not a
symlink. Edits to the `app/src/resume-engine/templates/` originals don't propagate automatically.

## Component layering

`components/ui/` (vendor shadcn/radix primitives, unmodified) → `components/basic/` (app composites:
layout chrome, the profile/resume form builders, the interview chat widget) and `components/ai-elements/`
(chat/streaming UI kit — markdown via `Streamdown`, code blocks via `shiki`). `src/design-system/` is a
**Storybook catalog, not a separate implementation layer** — `design-system/patterns/*` and
`design-system/ai/*` are `export *` re-exports of `components/basic/*`/`components/ai-elements/*`, and
`design-system/primitives/*` are thin wrappers around `components/ui/*`; edit the real implementation
under `components/`, not the design-system re-export.

## State management

No global client-state store (no Zustand/Redux/Jotai in the tree, despite what
`FOLDER-STRUCTURE.md`/`PATTERNS.md` describe). Server state is `@tanstack/react-query`
(`QueryClientProvider` set up once in `app/providers.tsx`); local UI state is plain
`useState`/Context; durable client-only data (an unauthenticated resume-builder draft) persists to
IndexedDB via `lib/indexdb.ts` and is claimed on sign-in by `hooks/use-sync-draft-on-auth.ts`.

## Known dead/inconsistent code (verified — don't assume these work)

- `(dashboard)/interviews` and `(dashboard)/prompt-builder` don't exist as routes, despite being
  referenced by the dashboard landing page's nav cards, `proxy.ts`'s route lists, and `services/api.ts`.
- `src/services/api.ts` (fetch-based, predates the `apis/`+`axios-instances.ts` pattern) has zero
  importers — dead.
- `(dashboard)/profiles/[id]/edit`'s "Preview Resume" flow navigates to `/profiles/[id]/edit/preview`,
  which has no page — a half-migrated `@modal` intercepting route that no longer exists. Currently 404s.
- `(dashboard)/profiles/[id]/edit/assistant-chat.tsx` has zero importers — superseded by
  `profile-editor.tsx`'s inline chat.
