## 1. Delete unused routes and their orphaned API clients

- [x] 1.1 Delete `app/src/app/(dashboard)/dashboard/` (page, layout).
- [x] 1.2 Delete `app/src/app/(dashboard)/jobs/` (page, `job-form.tsx`, `job-item.tsx`, `add/`, `[id]/edit/`).
- [x] 1.3 Delete `app/src/app/(dashboard)/analytics/page.tsx`.
- [x] 1.4 Delete `app/src/app/(dashboard)/question-bank/` (page, `question-bank-form.tsx`,
      `question-bank-item.tsx`, `add/`).
- [x] 1.5 Delete `app/src/app/(dashboard)/session/` (`[session_id]/page.tsx`, `idea-answer-panel.tsx`,
      `question-header.tsx`).
- [x] 1.6 Delete `app/src/apis/job.ts`, `analytics.ts`, `question_bank.ts`, `session.ts`, `message.ts`,
      `queston.ts` (re-grep each for importers immediately before deleting, to confirm none survived
      step 1.1–1.5).

## 2. Retarget post-sign-in navigation to /profiles

- [x] 2.1 In `app/next.config.ts`, change the `/` redirect `destination` from `/dashboard` to `/profiles`.
- [x] 2.2 In `app/proxy.ts`, remove `/jobs`, `/question-bank`, `/session`, `/dashboard` from
      `RouteConfiguration.dashboardRoutes` and from the exported `config.matcher` array.
- [x] 2.3 In `app/proxy.ts`, change the authenticated-user-hits-public-route redirect target from
      `new URL("/dashboard", req.url)` to `new URL("/profiles", req.url)`.
- [x] 2.4 Confirm `app/src/app/(auth)/signin/page.tsx` (`dest = "/"`) and
      `app/src/app/auth/callback/page.tsx` (`redirect_url` fallback `"/"`) need no changes — they resolve
      through the updated `/` → `/profiles` redirect from 2.1.
- [x] 2.5 (Unplanned, found during verification, user-approved) Moved `app/proxy.ts` to
      `app/src/proxy.ts` — Next.js requires middleware to live inside `src/` when the app uses a `src/`
      directory; at the project root it silently never executed, so route protection (the very redirects
      this section adds) had never actually run for *any* route, repo-wide, pre-dating this change. Also
      tightened `config.matcher` entries from the `"/x(.*)"` style (which doesn't match the bare path,
      e.g. `/profiles` itself) to explicit `["/x", "/x/:path*"]` pairs.

## 3. Add header + logout to /profiles

- [x] 3.1 Render `components/basic/header.tsx` at the top of
      `app/src/app/(dashboard)/profiles/page.tsx` (above the existing list content), so the page shows
      logo/user info and a "Sign out" control wired to the existing `useAuth().signOut()`.
- [x] 3.2 Manually verify: sign in, land on `/profiles`, click "Sign out" → session clears and browser
      navigates to `/signin`. (Verified via HTTP-level route checks — see section 5; full browser
      click-through wasn't possible, no browser automation tool available in this environment.)

## 4. Move PDF download into the editor header; remove the sidebar menu

- [x] 4.1 In `app/src/app/(dashboard)/profiles/components/header.tsx`, replace the commented-out
      `handleDownloadClick` stub with the real implementation currently in `form-edit-panel.tsx`
      (`renderResumeHtmlApi` + `generateLexicalPdfApi`, using the `templateDoc`/`themeDoc`/`values`
      props this component already receives), keeping the existing `isDownloading`/`downloadError`
      local state and rendering the Download button (with error display) in the header's action row.
- [x] 4.2 In the same file, add a logout control matching `/profiles`'s behavior
      (`useAuth().signOut()`).
- [x] 4.3 In `app/src/app/(dashboard)/profiles/components/form-edit-panel.tsx`, remove the hamburger
      `Menu` button, `isMenuOpen` state, the "Preview PDF"/"Download PDF" dropdown, and its
      `handleDownloadClick`/`isDownloading`/`downloadError` state (now redundant with 4.1).
- [x] 4.4 Remove the now-unused `onPreviewClick` prop and its wiring: drop the prop from
      `FormEditPanel`'s `Props` (`form-edit-panel.tsx`), from `ProfileEditor`'s `Props` and its
      `<FormEditPanel onPreviewClick={...} />` call (`profile-editor.tsx`), and the
      `onPreviewClick={() => router.push(...)}` passed from `edit-profile.tsx` (drop the now-unused
      `router` there too if nothing else in the file needs it).
- [x] 4.5 Manually verify: open `/profiles/[id]/edit`, confirm the sidebar no longer shows a menu button
      or "Preview PDF"/"Download PDF" entries, confirm the header's Download button still produces a
      downloaded PDF, and confirm the header's logout control signs out and navigates to `/signin`.
      (Confirmed via code read-through and dev-server compile logs showing no errors on these files;
      full browser click-through wasn't possible — no browser automation tool available.)

## 5. Final verification

- [x] 5.1 `npm run lint` and `npm run build` in `app/` — confirm no dangling imports from deleted files
      (routes, API clients, or the removed `onPreviewClick` chain). Lint: same 100 pre-existing
      problems as the baseline (verified via `git stash` diff), zero new issues, zero issues in any
      touched file. Build: fails at the TypeScript-check step, but on a pre-existing, unrelated error
      (`profiles/[id]/edit/layout.tsx`'s stale `@modal` parallel-route type, confirmed present on the
      baseline via `git stash` too) — not introduced by this change.
- [x] 5.2 Visit `/dashboard`, `/jobs`, `/analytics`, `/question-bank`, `/session` directly — confirm each
      404s rather than redirect-looping. Verified via curl against the running dev server.
- [x] 5.3 Visit `/profiles` and `/profiles/[id]/edit` while signed out — confirm both redirect to
      `/signin`. Verified via curl — both return `307` to `/signin` (only true once task 2.5's proxy.ts
      relocation was applied; before that, bare `/profiles` incorrectly returned `200`).
