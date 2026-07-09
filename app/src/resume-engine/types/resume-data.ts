import type { RichTextValue } from "./lexical";
import type { SkillGroup } from "@/components/basic/skill-builder";

export type ResumeExperience = {
  company?: string;
  role?: string;
  location?: string;
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
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: RichTextValue;
  website?: string;
  skills?: SkillGroup[];
  links?: ResumeSocialLink[];
  experiences?: ResumeExperience[];
  projects?: ResumeProject[];
  educations?: ResumeEducation[];
};
