## ADDED Requirements

### Requirement: Post-OAuth landing page
After a user completes Google OAuth sign-in and the session cookies are set, the system SHALL land the
user on `/profiles`.

#### Scenario: First sign-in of a session
- **WHEN** a user completes `handleGoogleSignIn` on `/signin` and returns through `/auth/callback` with
  no explicit `redirect_url` override
- **THEN** the browser ends up at `/profiles`

#### Scenario: Root path visited directly
- **WHEN** an authenticated or unauthenticated browser requests `/`
- **THEN** the system redirects to `/profiles` (unauthenticated requests are then redirected again to
  `/signin` by the existing route-protection check)

### Requirement: Authenticated access to public-only routes
When a request carries a valid `access_token` cookie and targets a public-only route (e.g. `/signin`),
the system SHALL redirect the request to `/profiles` instead of serving the public route.

#### Scenario: Already-signed-in user opens the sign-in page
- **WHEN** a browser with an `access_token` cookie requests `/signin`
- **THEN** the system redirects it to `/profiles`

### Requirement: Removed routes are not route-protected
`/dashboard`, `/jobs`, `/analytics`, `/question-bank`, and `/session` SHALL NOT appear in the
authenticated-route allowlist used to gate access or in the authenticated-redirect target.

#### Scenario: Deleted route requested after sign-out
- **WHEN** any request (authenticated or not) targets `/dashboard`, `/jobs`, `/analytics`,
  `/question-bank`, or `/session`
- **THEN** the system does not redirect it based on auth state (no matching route-protection rule); the
  request 404s because the page no longer exists
