# Frontend (App) Patterns

This guide shows common patterns used in the Next.js frontend application for building features consistently.

## Table of Contents

1. [API Client Pattern](#api-client-pattern)
2. [React Component Patterns](#react-component-patterns)
3. [Custom Hooks Pattern](#custom-hooks-pattern)
4. [Store (Zustand) Pattern](#store-zustand-pattern)
5. [Form & Builder Components](#form--builder-components)

---

## API Client Pattern

API clients are organized by domain in `/src/apis/`. Each file exports functions for a specific feature area.

### Setup: Axios Instances

**File: `src/apis/axios-instances.ts`**

```typescript
import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
});
```

### Single File: Profile APIs

**File: `src/apis/profile.ts`**

```typescript
import { CandidatePayload } from "@/app/(dashboard)/profiles/profile/compose/types";
import { axiosInstance } from "./axios-instances";

// ✅ Type definitions at the top
export interface Profile {
  id: string;
  user_id: string;
  name?: string;
  email?: string;
  experiences: Experience[];
  educations: Education[];
  skills: string[];
  created_at: string;
}

export interface Experience {
  role: string;
  company: string;
  start_date: string;
  end_date: string;
  tech_stack: string[];
  description: string;
}

// ✅ API functions with clear names and typed responses
export const createCandidateApi = async (
  payload: CandidatePayload
): Promise<{ id: string }> => {
  const { data } = await axiosInstance.post(`/api/profile`, payload);
  return data;
};

export const fetchProfiles = async (): Promise<Profile[]> => {
  const res = await axiosInstance.get("/api/me/profiles");
  return res.data;
};

export const getProfileById = async (id: string): Promise<Profile> => {
  const res = await axiosInstance.get(`/api/profile/${id}`);
  return res.data;
};

export const updateProfile = async (
  id: string,
  payload: any,
  options?: { signal?: AbortSignal }
): Promise<{ message: string }> => {
  const res = await axiosInstance.put(`/api/profile/${id}`, payload, {
    signal: options?.signal,
  });
  return res.data;
};

export const deleteProfile = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/api/profile/${id}`);
};

// ✅ Handle errors gracefully
export const getProfileReviewApi = async (
  id: string
): Promise<ProfileReview | null> => {
  try {
    const { data } = await axiosInstance.get(`/api/profile-review/${id}`);
    return data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};
```

### Pattern Rules

- **File organization**: One file per feature domain (profile, interview, session, etc.)
- **Type definitions**: Export all types at the module level
- **Function naming**: Use verb + noun (fetch, get, create, update, delete)
- **Return types**: Always explicitly type the return value
- **Error handling**: Catch expected errors (404 for missing resources) and re-throw unexpected ones
- **Configuration**: Use environment variables for base URLs

---

## React Component Patterns

### UI Components (shadcn/ui based)

**File: `src/components/ui/button.tsx`**

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
```

### Form/Builder Components

**File: `src/components/basic/skill-builder.tsx`**

```typescript
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";

export type SkillCategory = {
  category?: string;
  skills: string[];
};

type SkillsBuilderProps = {
  // ✅ Controlled component: value + onChange
  value: SkillCategory[];
  onChange: (value: SkillCategory[]) => void;
};

const SkillsBuilder = ({ value, onChange }: SkillsBuilderProps) => {
  const handleAddCategory = () => {
    onChange([...value, { category: "", skills: [""] }]);
  };

  const handleRemoveCategory = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {value.map((cat, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Input
              placeholder="Category (e.g. frontend)"
              value={cat.category || ""}
              onChange={(e) => {
                const updated = [...value];
                updated[i] = { ...updated[i], category: e.target.value };
                onChange(updated);
              }}
            />

            {cat.skills.map((skill, j) => (
              <Input
                key={j}
                value={skill}
                placeholder="Skill"
                onChange={(e) => {
                  const updated = [...value];
                  const skills = [...updated[i].skills];
                  skills[j] = e.target.value;
                  updated[i] = { ...updated[i], skills };
                  onChange(updated);
                }}
              />
            ))}

            <Button onClick={() => handleRemoveCategory(i)} variant="destructive" size="sm">
              Remove Category
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleAddCategory}>Add Category</Button>
    </div>
  );
};

export default SkillsBuilder;
```

### Pattern Rules

- **Props**: Use discriminated union types for complex props
- **Controlled components**: Always use `value` + `onChange` for form inputs
- **Type exports**: Export prop types alongside components
- **Composition**: Build larger components from smaller UI primitives
- **Styling**: Use Tailwind CSS + `cn()` utility for conditional classes

---

## Custom Hooks Pattern

Custom hooks encapsulate stateful logic or side effects.

### Data Fetching Hook

**File: `src/hooks/use-profiles.ts`** (example pattern)

```typescript
import { useEffect, useState } from "react";
import { fetchProfiles, Profile } from "@/apis/profile";

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchProfiles();
        setProfiles(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  return { profiles, isLoading, error };
}
```

### Real-time Hook (SSE)

**File: `src/hooks/use-profile-sse.ts`**

```typescript
import { useEffect } from "react";
import { axiosInstance } from "@/apis/axios-instances";

type UseProfileSSEProps = {
  profileId: string | undefined;
  onProfileUpdate: (data: any) => void;
};

export function useProfileSSE({ profileId, onProfileUpdate }: UseProfileSSEProps) {
  useEffect(() => {
    if (!profileId) return;

    // ✅ Get SSE URL from environment
    const sseUrl = process.env.NEXT_PUBLIC_SSE_URL;
    if (!sseUrl) {
      console.error("SSE URL not configured");
      return;
    }

    // ✅ Connect to SSE stream
    const eventSource = new EventSource(`${sseUrl}/${profileId}/stream`);

    eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        // ✅ Fetch fresh data from server after event
        const res = await axiosInstance.get(`/api/profile/${profileId}`);
        if (res.data) {
          onProfileUpdate(res.data);
        }
      } catch (error) {
        console.error("SSE processing failed:", error);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
    };

    // ✅ Cleanup on unmount or dependency change
    return () => {
      eventSource.close();
    };
  }, [profileId, onProfileUpdate]);
}
```

### Pattern Rules

- **Dependencies**: Always include dependency arrays in useEffect
- **Cleanup**: Always clean up subscriptions/timers in return function
- **Error handling**: Catch errors and expose via state
- **Naming**: Prefix with "use" and describe what it does (useProfiles, useProfileSSE)
- **Return value**: Return object with data, loading state, and error

---

## Store (Zustand) Pattern

Global state is managed with Zustand for chat sessions, auth state, etc.

**File: `src/store/resume-agent-chat.ts`**

```typescript
import { create } from "zustand";
import { sendResumeAgentChat } from "@/apis/chat";
import type { ChatMessage } from "@/components/basic/chat";

// ✅ Type your store state
type ResumeAgentChatState = {
  messages: ChatMessage[];
  threadId: string | null;
  isLoading: boolean;
  error: string | null;
  // ✅ Include action methods in type
  send: (profileId: string, text: string) => Promise<void>;
  reset: () => void;
};

export const useResumeAgentChat = create<ResumeAgentChatState>((set, get) => ({
  // ✅ Initial state
  messages: [],
  threadId: null,
  isLoading: false,
  error: null,

  // ✅ Async action with proper state updates
  send: async (profileId: string, text: string) => {
    set((state) => ({
      messages: [...state.messages, { role: "user", content: text }],
      isLoading: true,
      error: null,
    }));

    try {
      const { threadId } = get();
      const res = await sendResumeAgentChat(profileId, {
        message: text,
        thread_id: threadId ?? undefined,
      });

      set((state) => ({
        messages: [...state.messages, { role: "assistant", content: res.reply }],
        threadId: res.thread_id,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false, error: "Failed to send message" });
    }
  },

  reset: () =>
    set({ messages: [], threadId: null, isLoading: false, error: null }),
}));
```

### Usage in Components

```typescript
import { useResumeAgentChat } from "@/store/resume-agent-chat";

export function ChatWidget({ profileId }: { profileId: string }) {
  const { messages, isLoading, send, reset } = useResumeAgentChat();

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i} className={msg.role}>
          {msg.content}
        </div>
      ))}
      <input
        onKeyDown={async (e) => {
          if (e.key === "Enter") {
            await send(profileId, e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
      />
      <button onClick={reset}>Clear</button>
    </div>
  );
}
```

### Pattern Rules

- **State shape**: Keep state flat and simple
- **Actions**: Define all mutations as methods on the store
- **Async handling**: Set loading state before/after async operations
- **Cleanup**: Provide a reset method for tests and unmounting
- **Selectors**: Use subscriptions with specific selectors to minimize re-renders

---

## Form & Builder Components

Form builders are controlled components that manage arrays of items.

### Pattern

```typescript
// Parent component manages state, passes value + onChange to builder
const [skills, setSkills] = useState<SkillCategory[]>([]);

return (
  <SkillsBuilder
    value={skills}
    onChange={setSkills}
  />
);

// Builder handles UI and calls onChange when anything changes
const SkillsBuilder = ({ value, onChange }: Props) => {
  const updateCategory = (index: number, newValue: SkillCategory) => {
    const updated = [...value];
    updated[index] = newValue;
    onChange(updated);
  };

  return (
    <div>
      {value.map((item, i) => (
        <input
          key={i}
          value={item.category}
          onChange={(e) => updateCategory(i, { ...item, category: e.target.value })}
        />
      ))}
    </div>
  );
};
```

### Key Points

- ✅ Use immutable updates (spread operator, map, filter)
- ✅ Pass index when mapping arrays
- ✅ Call onChange on every change (parent handles debouncing if needed)
- ✅ Type the builder props clearly with interface/type

---

## Adding a New Feature

**Checklist:**

1. Create API client in `src/apis/<feature>.ts` with types
2. Create schema/validation if needed in `src/lib/`
3. Create custom hook(s) in `src/hooks/` if data fetching
4. Create components in `src/components/` (UI or feature-specific)
5. Create store in `src/store/` if global state needed
6. Import and use in pages under `src/app/`

Example: Adding a "goals" feature

```
src/apis/goals.ts           # API client
src/hooks/useGoals.ts       # Data fetching
src/components/GoalsForm.tsx # UI component
src/store/goals.ts          # Global state if needed
src/app/(dashboard)/goals/  # Pages
```
