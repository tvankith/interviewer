import { z } from "zod";

// ── LLM schema ───────────────────────────────────────────────────────────────
// Gemini's responseSchema (structured output) silently drops anyOf/oneOf, which
// is what z.nullable() produces. Use plain .optional() so every field maps to a
// simple JSON Schema type. The LLM result is normalised into ParsedResume below.

const llmProjectSchema = z.object({
  name: z.string().optional(),
  description: z.array(z.string()).default([]),
  tech_stack: z.array(z.string()).optional(),
});

const llmExperienceSchema = z.object({
  company: z.string().optional(),
  role: z.string().optional(),
  location: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.array(z.string()).default([]),
  tech_stack: z.array(z.string()).optional()
});

const llmEducationSchema = z.object({
  institute: z.string().optional(),
  course: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.array(z.string()).default([]),
});

const llmSocialLinkSchema = z.object({
  url: z.string().optional(),
  social_media: z.string().optional(),
});

export const llmParsedResumeSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  website: z.string().optional(),
  skills: z.array(z.string()).optional(),
  links: z.array(llmSocialLinkSchema).optional(),
  projects: z.array(llmProjectSchema).optional(),
  experiences: z.array(llmExperienceSchema).optional(),
  educations: z.array(llmEducationSchema).optional(),
});

// ── Wire/storage schema ───────────────────────────────────────────────────────
// Nullable + defaults match the Python ParsedResume model for API compatibility.

export const projectSchema = z.object({
  name: z.string().nullable().default(null),
  description: z.array(z.string()).default([]),
  tech_stack: z.array(z.string()).default([]),
});

export const experienceSchema = z.object({
  company: z.string().nullable().default(null),
  role: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  description: z.array(z.string()).default([]),
  tech_stack: z.array(z.string()).default([]),
});

export const educationSchema = z.object({
  institute: z.string().nullable().default(null),
  course: z.string().nullable().default(null),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  description: z.array(z.string()).default([]),
});

export const socialLinkSchema = z.object({
  url: z.string(),
  social_media: z.string(),
});

export const parsedResumeSchema = z.object({
  title: z.string().nullable().default(null),
  name: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  website: z.string().nullable().default(null),
  skills: z.array(z.string()).default([]),
  links: z.array(socialLinkSchema).default([]),
  projects: z.array(projectSchema).default([]),
  experiences: z.array(experienceSchema).default([]),
  educations: z.array(educationSchema).default([]),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;

/** An all-empty ParsedResume, returned when parsing yields nothing usable. */
export function emptyParsedResume(): ParsedResume {
  return {
    title: null,
    name: null,
    email: null,
    phone: null,
    location: null,
    summary: null,
    website: null,
    skills: [],
    links: [],
    projects: [],
    experiences: [],
    educations: [],
  };
}
