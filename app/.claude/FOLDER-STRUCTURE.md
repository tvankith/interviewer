# App Folder Structure

Next.js frontend application using App Router with TypeScript.

## Directory Organization

```
app/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── providers.tsx             # Global providers (auth, context, etc.)
│   │   ├── mix-panel.tsx            # Analytics integration
│   │   │
│   │   ├── (auth)/                   # Auth routes (layout group)
│   │   │   └── signin/               # Sign in page
│   │   │
│   │   ├── (dashboard)/              # Dashboard routes (protected, layout group)
│   │   │   ├── dashboard/            # Main dashboard page
│   │   │   ├── analytics/            # Analytics page
│   │   │   ├── interviews/           # Interviews management
│   │   │   ├── jobs/                 # Job listings
│   │   │   ├── profiles/             # User profiles
│   │   │   ├── question-bank/        # Question bank
│   │   │   ├── session/              # Interview sessions
│   │   │   └── api/                  # Internal API routes
│   │   │
│   │   ├── (public)/                 # Public routes (layout group)
│   │   │   └── resume-generator/     # Public resume generator
│   │   │
│   │   └── api/
│   │       └── [...path]/            # Proxy API routes
│   │
│   ├── apis/                         # API client functions
│   │   ├── auth.ts                   # Authentication API
│   │   ├── chat.ts                   # Chat/messaging API
│   │   ├── interview.ts              # Interview API
│   │   ├── job.ts                    # Job API
│   │   ├── message.ts                # Message API
│   │   ├── profile.ts                # Profile API
│   │   ├── question_bank.ts          # Question bank API
│   │   ├── queston.ts                # Questions API
│   │   ├── resume-template.ts        # Resume template API
│   │   ├── session.ts                # Session API
│   │   ├── analytics.ts              # Analytics API
│   │   └── axios-instances.ts        # Axios configuration
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # Basic UI components
│   │   ├── basic/                    # Basic feature components
│   │   └── ai-elements/              # AI-specific components
│   │
│   ├── design-system/                # Design system & component library
│   │   ├── primitives/               # Base UI elements
│   │   │   ├── accordion/
│   │   │   ├── alert/
│   │   │   ├── avatar/
│   │   │   ├── badge/
│   │   │   ├── button/
│   │   │   ├── card/
│   │   │   ├── dialog/
│   │   │   ├── dropdown-menu/
│   │   │   ├── input/
│   │   │   ├── select/
│   │   │   ├── tabs/
│   │   │   ├── textarea/
│   │   │   └── ... (other primitives)
│   │   │
│   │   ├── foundations/               # Design foundations
│   │   │   ├── colors/
│   │   │   ├── typography/
│   │   │   └── spacing/
│   │   │
│   │   ├── layout/                    # Layout components
│   │   │   ├── app-shell/
│   │   │   ├── panel/
│   │   │   └── side-bar/
│   │   │
│   │   ├── patterns/                  # Reusable patterns
│   │   │   ├── chat/
│   │   │   ├── file-upload/
│   │   │   ├── form-submit-button/
│   │   │   ├── rich-text-editor/
│   │   │   ├── experience-builder/
│   │   │   ├── education-builder/
│   │   │   ├── skill-builder/
│   │   │   ├── project-builder/
│   │   │   └── ... (other patterns)
│   │   │
│   │   └── ai/                       # AI-specific components
│   │       ├── agent/
│   │       ├── message/
│   │       ├── prompt-input/
│   │       ├── code-block/
│   │       ├── terminal/
│   │       └── ... (40+ AI components)
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-auth.ts               # Authentication hook
│   │   ├── use-sync-draft-on-auth.ts
│   │   └── useResumeMCP.ts           # Resume MCP hook
│   │
│   ├── lib/                          # Utilities & libraries
│   │   ├── supabase/                 # Supabase client
│   │   └── utils.ts                  # General utilities
│   │
│   ├── helpers/                      # Helper functions
│   │
│   ├── services/                     # Business logic services
│   │
│   ├── store/                        # State management (Zustand, Redux, etc.)
│   │
│   └── config.ts                     # Configuration
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── README.md
├── CLAUDE.md                         # Project documentation
└── AGENTS.md                         # Agents documentation
```

## Key Sections

### App Router (`src/app/`)
- **Layout Groups**: `(auth)`, `(dashboard)`, `(public)` organize routes without affecting URL structure
- **API Routes**: Proxy to backend services
- **Pages**: Each route has corresponding page components

### APIs (`src/apis/`)
Client-side API functions for communicating with backend servers:
- Authentication, interviews, jobs, profiles
- Chat and messaging
- Question bank and sessions
- Resume templates and analytics

### Components
- **Primitives**: Reusable UI building blocks (button, input, dialog, etc.)
- **Patterns**: Composition of primitives for common use cases (forms, builders, etc.)
- **AI Components**: Rich components for AI interactions (chat, code blocks, terminals, etc.)
- **Layout**: App shell, sidebar, panels
- **Basic/UI**: Feature-specific and basic components

### Design System (`src/design-system/`)
Organized by hierarchy:
1. **Primitives** - Base components
2. **Foundations** - Design tokens (colors, typography, spacing)
3. **Layout** - Structural components
4. **Patterns** - Composed, reusable feature patterns
5. **AI** - AI-specific rich components

### Utilities
- **Hooks** - Authentication, resume MCP, drafts syncing
- **Lib** - Supabase client, general utilities
- **Helpers** - Pure utility functions
- **Services** - Business logic
- **Store** - State management

## Configuration Files
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts
- `config.ts` - App-level configuration
