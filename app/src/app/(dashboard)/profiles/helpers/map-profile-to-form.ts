import { Profile } from "@/apis/profile";
import { CandidateFormValues } from "../profile/compose/types";
import { normalizeRichText } from "@/resume-engine/lexical-json/normalize-rich-text";

export const mapProfileToForm = (data: Profile): CandidateFormValues => ({
  projects: (data.projects || []).map((p) => ({
    ...p,
    tech_stack: p.tech_stack,
    description: normalizeRichText(p.description),
  })),
  experiences: (data.experiences || []).map((e) => ({
    ...e,
    tech_stack: e.tech_stack,
    description: normalizeRichText(e.description),
  })),
  educations: (data.educations || []).map((ed) => ({
    ...ed,
    description: normalizeRichText(ed.description),
  })),
  links: data.links || [],
  title: data.title,
  name: data.name,
  email: data.email,
  phone: data.phone,
  location: data.location,
  summary: normalizeRichText(data.summary),
  website: data.website,
  skills: data.skills || [],
  about: "",
  resume_file: null,
  target_role: data.job_requirement?.raw_description || "",
  template_id: data.template_id || undefined,
  theme_id: data.theme_id || undefined,
});
