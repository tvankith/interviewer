## Why

The dashboard, jobs, analytics, and question-bank areas are unfinished/unused surfaces (the dashboard
landing page itself links to two routes — `/interviews` and `/prompt-builder` — that don't even exist),
and the interview `session` flow is being retired from `app`. Profiles is the only area candidates
actually use, but today sign-in drops the user on `/dashboard` (via a `next.config.ts` redirect) instead
of `/profiles`, and neither `/profiles` nor its resume editor has a way to sign out — the only working
logout button lives on the soon-to-be-deleted dashboard header. Cleaning these up and consolidating
sign-out onto the surfaces that remain removes dead/half-migrated code and an unreachable-after-cleanup
redirect target, and gives users a way to log out at all once `/dashboard` is gone.

## What Changes

- **BREAKING**: Delete the `/dashboard`, `/jobs`, `/analytics`, `/question-bank`, and `/session` routes
  (all pages/components under `app/src/app/(dashboard)/{dashboard,jobs,analytics,question-bank,session}`)
  and their now-orphaned API client modules (`apis/job.ts`, `apis/analytics.ts`, `apis/question_bank.ts`,
  `apis/session.ts`, `apis/message.ts`, `apis/queston.ts` — each has no importer left outside the deleted
  pages).
- **BREAKING**: Change the post-sign-in destination from `/dashboard` to `/profiles`:
  - `next.config.ts`'s `/` → `/dashboard` redirect becomes `/` → `/profiles`.
  - `proxy.ts`'s "authenticated user hits a public route" branch redirects to `/profiles` instead of
    `/dashboard`; `dashboardRoutes` and the route `matcher` drop the five deleted route prefixes.
- Add a header to `/profiles` with a logout action that signs the user out and navigates to `/signin`.
- On `/profiles/[id]/edit`:
  - Remove the sidebar hamburger menu offering "Preview PDF" (already a dead link — see Impact) and
    "Download PDF".
  - Move the working PDF download action into the page's top header, next to the new logout button.
  - Add the same logout action as `/profiles`.

## Capabilities

### New Capabilities
- `post-signin-navigation`: where an authenticated user lands — right after OAuth sign-in and whenever
  they hit a public-only route (e.g. `/signin`) while already authenticated.
- `profiles-header`: the header on `/profiles` and `/profiles/[id]/edit`, including logout and (on the
  editor) the resume PDF download action.

### Modified Capabilities
None — no existing `openspec/specs/` capability governs routing, dashboard/jobs/analytics/question-bank/
session pages, or headers today.

## Impact

- **Routing**: `app/next.config.ts`, `app/proxy.ts`.
- **Deleted routes**: `app/src/app/(dashboard)/dashboard/`, `.../jobs/`, `.../analytics/`,
  `.../question-bank/`, `.../session/` (pages, layouts, and their local components).
- **Deleted API clients**: `app/src/apis/job.ts`, `analytics.ts`, `question_bank.ts`, `session.ts`,
  `message.ts`, `queston.ts`.
- **Sign-in flow**: `app/src/app/(auth)/signin/page.tsx` (OAuth `dest`), which flows through
  `app/src/app/auth/callback/page.tsx`'s `redirect_url` handling (no change needed there — it already
  reads the destination from the caller).
- **`/profiles`**: `app/src/app/(dashboard)/profiles/page.tsx` gains a header; reuses the existing
  `useAuth().signOut()` (`app/src/hooks/use-auth.ts`), which already clears query cache and pushes to
  `/signin`.
- **`/profiles/[id]/edit`**: `app/src/app/(dashboard)/profiles/components/header.tsx` (add download +
  logout), `app/src/app/(dashboard)/profiles/components/form-edit-panel.tsx` (remove the menu; its
  `handleDownloadClick` — `renderResumeHtmlApi` + `generateLexicalPdfApi` — moves to `header.tsx`, which
  already receives `templateDoc`/`themeDoc`/`values` as props). `onPreviewClick` threading
  (`edit-profile.tsx` → `profile-editor.tsx` → `form-edit-panel.tsx`) is removed along with the menu,
  since it only ever pointed at `/profiles/[id]/edit/preview`, a route that doesn't exist (confirmed
  dead in `app/.claude/CLAUDE.md`).
- **Out of scope**: `src/components/basic/side-bar.tsx` still links to `/jobs`, `/interviews`,
  `/question-bank`, `/analytics` but has zero importers outside the Storybook `design-system/` catalog
  today (pre-existing dead code, confirmed via grep) — left untouched.
