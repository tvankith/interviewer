import { axiosInstance } from "./axios-instances";

export type Interview = {
  id: string;
  job_requirement_id: string;
  title: string;
  status: string;
  ended_at: any;
  user_id: string;
  candidate_profile_id: string;
  current_question_id: string;
  created_at: string;
  started_at: string;
  gap_analysis_id: any;
  job_requirement: JobRequirement;
  candidate_profile: CandidateProfile;
};

export type JobRequirement = {
  id: string;
  role: string;
  raw_description: string;
  experience_level: string;
  difficulty_level: string;
  created_at: string;
};

export type CandidateProfile = {
  id: string;
};

export async function fetchInterviews(): Promise<Interview[]> {
  const response = await axiosInstance(`/api/interviews/`);
  return response.data;
}

export async function deleteSession(id: string): Promise<void> {
  await axiosInstance.delete(`/api/session/${id}`);
}