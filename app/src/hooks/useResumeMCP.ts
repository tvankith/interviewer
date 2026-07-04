// Hook for using MCP-powered resume generation endpoints.
// Provides methods to generate, improve, and review resume content.

import { useMutation } from "@tanstack/react-query";
import { getProfileReviewApi, reviewProfileApi, executeReviewActionApi } from "@/apis/profile";

export interface GenerateContentRequest {
  content_type: "summary" | "experience" | "skills" | "projects" | "education";
  context?: string;
}

export interface ImproveRequest {
  section: "summary" | "experience" | "skills" | "projects" | "education";
  feedback?: string;
}

export interface ReviewRequest {
  focus_areas?: string[];
}

export interface UpdateSectionRequest {
  section: "summary" | "experience" | "skills" | "projects" | "education";
  content: string;
}

export interface ResumeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export function useResumeMCP(profileId: string) {

  const getReview = useMutation({
    mutationFn: ()=> getProfileReviewApi(profileId),
  });

  const generateReview = useMutation({
    mutationFn: ()=> reviewProfileApi(profileId)
  })

  const executeAction = useMutation({
    mutationFn: (prompt: string) => executeReviewActionApi(profileId, prompt),
  });

  return {
    getReview,
    generateReview,
    executeAction
  };
}
