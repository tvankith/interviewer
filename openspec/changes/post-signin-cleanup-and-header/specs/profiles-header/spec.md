## ADDED Requirements

### Requirement: Logout from the profiles list page
`/profiles` SHALL display a header containing a logout control. Activating it SHALL sign the user out
and navigate to `/signin`.

#### Scenario: User logs out from /profiles
- **WHEN** a signed-in user on `/profiles` clicks the header's logout control
- **THEN** the system invalidates the session (clears cached auth state) and navigates the browser to
  `/signin`

### Requirement: Logout from the profile editor page
`/profiles/[id]/edit` SHALL display a header containing a logout control with the same behavior as the
`/profiles` list page's logout control.

#### Scenario: User logs out from the resume editor
- **WHEN** a signed-in user on `/profiles/[id]/edit` clicks the header's logout control
- **THEN** the system invalidates the session and navigates the browser to `/signin`

### Requirement: PDF download from the profile editor header
`/profiles/[id]/edit`'s header SHALL provide a control that generates and downloads the current resume
as a PDF. This control replaces the "Download PDF" entry previously reachable only through a sidebar
menu.

#### Scenario: Download from the header
- **WHEN** a user on `/profiles/[id]/edit` clicks the header's download control
- **THEN** the system renders the current form values to a PDF and triggers a browser download of it,
  without requiring the user to open any additional menu

#### Scenario: Download fails
- **WHEN** PDF generation or rendering fails after the user clicks the header's download control
- **THEN** the system surfaces an error indication in the header and does not trigger a download

### Requirement: No sidebar PDF menu on the profile editor
`/profiles/[id]/edit` SHALL NOT display the sidebar menu previously offering "Preview PDF" and
"Download PDF" as separate menu entries.

#### Scenario: Sidebar menu is gone
- **WHEN** a user views `/profiles/[id]/edit`
- **THEN** no menu control offering "Preview PDF" or "Download PDF" is present in the editor's left
  sidebar
