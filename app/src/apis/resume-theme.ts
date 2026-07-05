import { axiosInstance } from "./axios-instances";
import type { ThemeDocument } from "@/resume-engine/types/theme";

export interface ThemeRecord {
  id: string;
  name: string;
  version: string;
  content: ThemeDocument;
  is_public: boolean;
  created_at: string;
}

export interface ThemeList {
  items: ThemeRecord[];
  total: number;
  page: number;
  limit: number;
}

export const fetchResumeTheme = async (id: string): Promise<ThemeRecord> => {
  const res = await axiosInstance.get(`/api/resume-themes/${id}`);
  return res.data;
};

export const fetchDefaultResumeTheme = async (): Promise<ThemeRecord> => {
  const res = await axiosInstance.get("/api/resume-themes/default");
  return res.data;
};

export const fetchResumeThemes = async (): Promise<ThemeList> => {
  const res = await axiosInstance.get("/api/resume-themes", { params: { limit: 100 } });
  return res.data;
};
