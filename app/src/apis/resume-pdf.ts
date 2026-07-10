import { axiosInstance } from "./axios-instances";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";
import type { ResumeData } from "@/resume-engine/types/resume-data";

/**
 * Renders a resume to a full HTML document via the local Pages Router route
 * (render-static-html.ts pulls in react-dom/server, which can't be imported
 * from client code or the App Router's RSC layer).
 */
export const renderResumeHtmlApi = async ({
  templateDoc,
  themeDoc,
  data,
}: {
  templateDoc: TemplateDocument;
  themeDoc: ThemeDocument;
  data: ResumeData;
}): Promise<string> => {
  const { data: response } = await axiosInstance.post<{ html: string }>(
    "/api/resume/render-html",
    { templateDoc, themeDoc, data }
  );
  return response.html;
};

/** Sends rendered resume HTML to api-server, which forwards it to the PDF lambda. */
export const generateLexicalPdfApi = async (html: string): Promise<string> => {
  const { data } = await axiosInstance.post<{ url: string }>("/api/lexical/pdf", {
    html,
  });
  return data.url;
};
