## Context

`app`'s route group `(dashboard)` currently holds seven areas: `dashboard`, `jobs`, `analytics`,
`question-bank`, `session`, `profiles`, plus the top-level `resume-generator` (public group). Only
`profiles` is a real, finished feature — `dashboard`'s own nav cards link to two routes
(`/interviews`, `/prompt-builder`) that were never built, and `jobs`/`analytics`/`question-bank`/`session`
are separate half-built CRUD/interview screens with no cross-links into `profiles`. Sign-in currently
lands on `/dashboard` only because of a blanket `next.config.ts` redirect (`/` → `/dashboard`); nothing
about that target is load-bearing.

Two independent header components already exist and this change extends both rather than introducing a
third:
- `components/basic/header.tsx` — a generic top bar (logo, user avatar/email, "Sign out" via
  `useAuth().signOut()`) currently wired up only via `AppShell` in the soon-to-be-deleted
  `dashboard/layout.tsx`.
- `(dashboard)/profiles/components/header.tsx` — the editor's own toolbar (Edit/Spec mode toggle, Resume
  import, and a *commented-out* download stub), rendered by `profile-editor.tsx` for `/profiles/[id]/edit`
  only.

`useAuth()` (`hooks/use-auth.ts`) already exposes `signOut()` — calls `logout()`, clears the react-query
cache, and does `router.push("/signin")` — so no new auth logic is needed anywhere in this change.

## Goals / Non-Goals

**Goals:**
- Land authenticated users on `/profiles` in both places that currently target `/dashboard`
  (`next.config.ts`'s `/` redirect, and `proxy.ts`'s "authenticated user hit a public route" branch).
- Remove `dashboard`, `jobs`, `analytics`, `question-bank`, `session` entirely — pages, their local
  components, and API client modules that have no remaining importer once those pages are gone.
- Give `/profiles` a header with a working logout button.
- On `/profiles/[id]/edit`, replace the hamburger "Preview PDF / Download PDF" menu with: the working
  download action relocated into the existing top header, plus a logout button.

**Non-Goals:**
- Not building a shared/global header component used by every route — the two headers stay separate
  call sites, each gaining a logout affordance independently (matches how they're already structured;
  see Decision 1).
- Not touching `src/components/basic/side-bar.tsx` — it references three of the deleted routes but has
  no importer outside the Storybook `design-system/` catalog, so it's pre-existing dead code, not a
  regression this change introduces.
- Not fixing `proxy.ts`'s pre-existing `/resume-generator` and `/interviews` matcher entries
  (`/interviews` isn't a real route either) — out of scope; only the five routes named in the proposal
  are touched.
- Not changing PDF generation itself (`renderResumeHtmlApi` / `generateLexicalPdfApi`) — only where the
  button that triggers it lives.

## Decisions

**1. Keep two headers, don't unify them.**
`/profiles` (list) and `/profiles/[id]/edit` (editor) have unrelated toolbars today — one is empty chrome
above a list, the other is a mode-switcher/import bar. Forcing them through one shared component ahead of
any other page needing a header would be speculative generality for a two-page change. Each gets its own
logout button wired to the same `useAuth().signOut()`.
- *Alternative considered*: promote `components/basic/header.tsx` (already logo+avatar+signout) into
  `(dashboard)/layout.tsx` so it wraps every route in the group automatically. Rejected: that layout also
  wraps `/profiles/[id]/edit`, which needs its *own* header (mode toggle, import, download) — the two
  would stack, or the group-wide header would need per-route conditionals, which is more complex than
  adding one button in two places.

**2. Reuse `components/basic/header.tsx` for `/profiles`, don't hand-roll a new one.**
It already does exactly what's asked (logout → `/signin`) and is a proven pattern (same one
`dashboard/layout.tsx` used). Render it directly in `profiles/page.tsx` (or a thin wrapper) rather than
resurrecting `AppShell`, since `AppShell` has no other role here.

**3. Move `form-edit-panel.tsx`'s `handleDownloadClick` into `profiles/components/header.tsx` verbatim,
delete the dead stub already there.**
`header.tsx` already receives `templateDoc`, `themeDoc`, and `values` as props — the exact inputs
`renderResumeHtmlApi`/`generateLexicalPdfApi` need — so the working implementation from
`form-edit-panel.tsx` (not the commented-out placeholder currently in `header.tsx`) moves over unchanged
except for its call site. `isDownloading`/`downloadError` local state moves with it.

**4. Delete `onPreviewClick` threading, not just the menu item.**
"Preview PDF" in the menu called `onPreviewClick`, which navigates to `/profiles/[id]/edit/preview` — a
route that doesn't exist (`app/.claude/CLAUDE.md` confirms this 404s today). Removing only the menu
button but leaving the prop wired through `edit-profile.tsx` → `profile-editor.tsx` → `form-edit-panel.tsx`
would leave a dead parameter chain with no caller. Since the menu was its only entry point, the prop and
its three call sites are removed together.

**5. Delete orphaned API client modules alongside their pages, not just the pages.**
`apis/job.ts`, `analytics.ts`, `question_bank.ts`, `session.ts`, `message.ts`, `queston.ts` are each
imported exclusively by files under the five deleted route directories (verified via grep — zero
importers remain once those directories go). Leaving them would be untriggerable dead code exporting
functions against endpoints nothing calls.

## Risks / Trade-offs

- [Anything still linking to `/dashboard`, `/jobs`, `/analytics`, `/question-bank`, `/session` after
  deletion (bookmarks, external links) now 404s] → Acceptable: `proxy.ts`'s matcher no longer protects
  those paths, so they 404 via Next's default not-found handling rather than redirect-looping through a
  deleted protected route.
- [`side-bar.tsx` (dead code, per Non-Goals) still references three deleted routes] → No runtime impact
  (zero real importers); flagged in proposal's Impact section for visibility, not fixed here.
- [Removing `next.config.ts`'s `/` → `/dashboard` redirect without a replacement leaves `/` with no
  route] → Mitigated: redirect target changes to `/profiles` (still a redirect, just a different
  destination), not removed outright.

## Migration Plan

Single-PR change, no data migration or feature flag needed — this is a same-deploy route
deletion/redirect-retarget:
1. Delete the five route directories and their orphaned API clients.
2. Update `next.config.ts` and `proxy.ts` redirect/matcher targets together (they must move in lockstep —
   leaving one pointed at `/dashboard` after the routes are gone reintroduces the 404 loop this change
   fixes).
3. Add the `/profiles` header and wire up the editor header (download + logout), removing the menu.
4. Manual verification: sign in → land on `/profiles`; visit `/profiles` and `/profiles/[id]/edit`
   directly while signed out → redirected to `/signin`; log out from both pages → lands on `/signin`;
   download PDF from the editor header still produces a file; visiting `/dashboard`, `/jobs`,
   `/analytics`, `/question-bank`, `/session` all 404.

Rollback: revert the PR — no persisted state changes.

## Open Questions

None — scope and target routes were explicit in the request; existing `useAuth`/PDF-generation code is
reused as-is.
