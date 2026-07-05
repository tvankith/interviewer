import type { candidate_profile as PrismaCandidateProfile, profile_spec as PrismaProfileSpec, resume_template as PrismaResumeTemplate, resume_theme as PrismaResumeTheme, conversation_thread as PrismaConversationThread } from '@prisma/client'; // eslint-disable-line @typescript-eslint/no-unused-vars

// Use Prisma-generated types directly
export type CandidateProfile = PrismaCandidateProfile;
export type ProfileSpec = PrismaProfileSpec;
export type ResumeTemplate = PrismaResumeTemplate;
export type ResumeTheme = PrismaResumeTheme;
export type ConversationThread = PrismaConversationThread;

// For backwards compatibility
export type Profile = PrismaCandidateProfile;

export interface CreateProfileInput {
  title?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: Record<string, unknown> | null;
  website?: string | null;
  skills?: any;
  projects?: any;
  experiences?: any;
  educations?: any;
  links?: any;
  template_id?: string | null;
  theme_id?: string | null;
}

export interface UpdateProfileInput {
  title?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: Record<string, unknown> | null;
  website?: string | null;
  skills?: any;
  projects?: any;
  experiences?: any;
  educations?: any;
  links?: any;
  template_id?: string | null;
  theme_id?: string | null;
}

export interface CreateProfileSpecInput {
  name: string;
  content?: string | null;
}

export interface UpdateProfileSpecInput {
  name?: string;
  content?: string | null;
}

export interface ProfileSpecResponse {
  id: string;
  candidate_profile_id: string;
  name: string;
  content: string | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}

export interface ProfileResponse {
  id: string;
  user_id: string;
  title: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: Record<string, unknown> | null;
  website: string | null;
  skills: any;
  projects: any;
  experiences: any;
  educations: any;
  links: any;
  template_id: string | null;
  theme_id: string | null;
  created_at: Date;
  deleted_at: Date | null;
}

export interface CreateResumeTemplateInput {
  name: string;
  version?: string;
  content: Record<string, unknown>;
  is_public?: boolean;
  thumbnail_url?: string | null;
}

export interface UpdateResumeTemplateInput {
  name?: string;
  version?: string;
  content?: Record<string, unknown>;
  is_public?: boolean;
  thumbnail_url?: string | null;
}

export interface CreateResumeThemeInput {
  name: string;
  version?: string;
  content: Record<string, unknown>;
  is_public?: boolean;
}

export interface UpdateResumeThemeInput {
  name?: string;
  version?: string;
  content?: Record<string, unknown>;
  is_public?: boolean;
}

export interface ListOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateConversationThreadFromWebhookInput {
  thread_id: string;
  candidate_id: string;
}

export interface ThreadMessagesResponse {
  thread_id: string;
  messages: unknown[];
}

export interface ServiceError {
  code: string;
  message: string;
  statusCode: number;
}
