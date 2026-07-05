import type { TemplateDocument } from "@/resume-engine/types/template";

export default async function getResumeTemplate(templateId?: string | null): Promise<TemplateDocument | null> {
  const path = templateId ? `/api/resume-templates/${templateId}` : `/api/resume-templates/default`;
  try {
    const response = await fetch(`${process.env.API_SERVER_URL}${path}`);
    if (!response.ok) return null;
    const data = await response.json();
    return (data?.content as TemplateDocument) ?? null;
  } catch {
    return null;
  }
}
