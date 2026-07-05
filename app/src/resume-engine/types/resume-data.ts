import type { RichTextValue } from "./lexical";

export type ResumeExperience = {
  company?: string;
  role?: string;
  start_date?: string;
  end_date?: string;
  description?: RichTextValue;
  tech_stack: string[];
};

export type ResumeProject = {
  name?: string;
  description?: RichTextValue;
  tech_stack: string[];
};

export type ResumeEducation = {
  institute?: string;
  course?: string;
  start_date?: string;
  end_date?: string;
  description?: RichTextValue;
};

export type ResumeSocialLink = {
  url: string;
  social_media: string;
};

/**
 * Content-only resume data. Field names are the binding vocabulary: a
 * template's `binding: "summary"` or `binding: "experiences"` resolves
 * directly against this shape (see binding/resolve-binding.ts).
 */
export type ResumeData = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: RichTextValue;
  website?: string;
  skills?: string[];
  links?: ResumeSocialLink[];
  experiences?: ResumeExperience[];
  projects?: ResumeProject[];
  educations?: ResumeEducation[];
};
