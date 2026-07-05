import { axiosInstance } from "./axios-instances";
import type { TemplateDocument } from "@/resume-engine/types/template";

export interface Template {
  id: string;
  name: string;
  version: string;
  content: TemplateDocument;
  thumbnail_url: string | null;
  is_public: boolean;
  created_at: string;
}

export interface Templates {
  templates: Template[];
  total: number;
}

export const fetchResumeTemplates = async (): Promise<Templates> => {
  const res = await axiosInstance.get("/api/resume-templates");
  return res.data;
};
