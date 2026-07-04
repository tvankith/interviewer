import { Profile } from "@/apis/profile";
import { CandidateFormValues } from "../profile/compose/types";

export const mapProfileToForm = (data: Profile): CandidateFormValues => ({
  projects: (data.projects || []).map((p) => ({
    ...p,
    tech_stack: p.tech_stack,
  })),
  experiences: (data.experiences || []).map((e) => ({
    ...e,
    tech_stack: e.tech_stack,
  })),
  educations: data.educations || [],
  links: data.links || [],
  name: data.name,
  email: data.email,
  phone: data.phone,
  location: data.location,
  summary: data.summary,
  website: data.website,
  skills: data.skills || [],
  about: "",
  resume_file: null,
  target_role: data.job_requirement?.raw_description || "",
});
