import { CandidatePayload } from "@/app/(dashboard)/profiles/profile/compose/types";
import { axiosInstance } from "./axios-instances";
import { mapProfileToForm } from "@/app/(dashboard)/profiles/helpers/map-profile-to-form";
import serverApi from "@/lib/backend";
import type { RichTextValue } from "@/resume-engine/types/lexical";

export const parseResumeApi = async (input: {
  file?: File | null;
  text?: string;
}) => {
  const formData = new FormData();

  if (input.file) {
    formData.append("file", input.file);
  }

  if (input.text) {
    formData.append("text", input.text);
  }

  const { data } = await axiosInstance.post(
    `/api/profile/resume/parse`,
    formData,
    {
      headers: {
        // Set to null so axios drops the instance-level "application/json" default,
        // allowing XHR to auto-set "multipart/form-data; boundary=..." correctly.
        "Content-Type": null,
      },
    }
  );

  return data;
};

export const createCandidateApi = async (payload: CandidatePayload): Promise<{ id: string }> => {
  const { data } = await axiosInstance.post(
    `/api/profile`,
    payload
  );

  return data;
};

/** -----------------------------
 * Types (adjust to backend)
 -----------------------------*/
 export interface Education {
  institute?: string;
  course?: string;
  start_date?: string;
  end_date?: string;
  description?: RichTextValue;
}

export interface SocialLink {
  url: string;
  social_media: string;
}

export interface JobRequirementData {
  id: string;
  raw_description?: string;
  role?: string;
  company?: string;
  experience_level?: string;
  primary_skills_by_category?: Record<string, string[]>;
  preferred_skills_by_category?: Record<string, string[]>;
  responsibilities?: string[];
  requirements?: string[];
  evaluation_focus_areas?: string[];
  difficulty_level?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  title?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: RichTextValue;
  website?: string;
  projects: Project[];
  experiences: Experience[];
  educations: Education[];
  links: SocialLink[];
  skills: string[];
  template_id?: string | null;
  theme_id?: string | null;
  created_at: string;
  job_requirement_id?: string;
  job_requirement?: JobRequirementData | null;
}

export interface Project {
  name: string;
  tech_stack: string[];
  description: RichTextValue;
}

export interface Experience {
  role: string;
  company: string;
  end_date: string;
  start_date: string;
  tech_stack: string[];
  description: RichTextValue;
}

/** -----------------------------
 * Fetch All Profiles
 -----------------------------*/
export const fetchProfiles = async (): Promise<Profile[]> => {
  const res = await axiosInstance.get("/api/me/profiles");
  return res.data.items ?? res.data;
};

/** -----------------------------
 * Get Profile By ID
 -----------------------------*/
export const getProfileById = async (
  id: string
) => {
  const res = await serverApi.get(`/api/profile/${id}`);
  return mapProfileToForm(res.data);
};

export const deleteProfile = async (id: string) => {
  const { data } = await axiosInstance.delete(`/api/profile/${id}`);
  return data;
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

export const saveTargetRoleApi = async (
  id: string,
  target_role: string
): Promise<{ job_requirement_id: string }> => {
  const { data } = await axiosInstance.post(`/api/profile/${id}/target-role`, {
    target_role,
  });
  return data;
};

export interface SkillsAnalysis {
  matched: string[];
  missing: string[];
  preferred_missing: string[];
}

export interface SectionFeedback {
  section: string;
  score: number; // 0–100
  status: string;
  issues: string[];
  suggestions: string[];
}

export interface ReviewAction {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action_type: "add_skill" | "improve_section" | "rewrite_summary" | "add_experience_detail" | "add_project";
  target_section: string;
  prompt: string;
}

export interface ProfileReview {
  overall_score: number; // 0–100
  ats_compatibility: string;
  skills_analysis: SkillsAnalysis;
  section_reviews: SectionFeedback[];
  strengths: string[];
  quick_wins: string[];
  red_flags: string[];
  summary: string;
  actions?: ReviewAction[];
}

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

export const reviewProfileApi = async (
  profile_id: string
): Promise<ProfileReview> => {
  const { data } = await axiosInstance.post(`/api/profile-review/${profile_id}`);
  return data;
};

export interface ExecuteActionResponse {
  reply: string;
  proposed_changes: Record<string, any> | null;
  agent: string;
}

export const executeReviewActionApi = async (
  profile_id: string,
  prompt: string,
  thread_id?: string
): Promise<ExecuteActionResponse> => {
  const { data } = await axiosInstance.post(
    `/api/profile/${profile_id}/action`,
    { prompt, thread_id }
  );
  return data;
};

// ===== SPEC APIS =====

export interface ProfileSpec {
  id: string;
  candidate_profile_id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string | null;
}

export const createSpecApi = async (
  profile_id: string,
  spec: { name: string; content: string }
): Promise<ProfileSpec> => {
  const { data } = await axiosInstance.post(
    `/api/profile-spec/${profile_id}`,
    spec
  );
  return data;
};

export const listSpecsApi = async (
  profile_id: string
): Promise<ProfileSpec[]> => {
  const { data } = await axiosInstance.get(
    `/api/profile-spec/${profile_id}`
  );
  return data;
};

export const getSpecApi = async (
  profile_id: string,
  spec_id: string
): Promise<ProfileSpec> => {
  const { data } = await axiosInstance.get(
    `/api/profile-spec/${profile_id}/${spec_id}`
  );
  return data;
};

export const updateSpecApi = async (
  profile_id: string,
  spec_id: string,
  spec: { name?: string; content?: string }
): Promise<ProfileSpec> => {
  const { data } = await axiosInstance.patch(
    `/api/profile-spec/${profile_id}/${spec_id}`,
    spec
  );
  return data;
};

export const deleteSpecApi = async (
  profile_id: string,
  spec_id: string
): Promise<{ message: string }> => {
  const { data } = await axiosInstance.delete(
    `/api/profile-spec/${profile_id}/${spec_id}`
  );
  return data;
};