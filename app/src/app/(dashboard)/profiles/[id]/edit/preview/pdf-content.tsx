import { Suspense } from "react";
import { getProfileById } from "@/apis/profile";
import { generatePdfFromHtml } from "@/app/(dashboard)/profiles/actions";
import { renderResumeToHtmlDocument } from "@/resume-engine/render/render-static-html";
import getResumeTemplate from "@/helpers/getResumeTemplate";
import getResumeTheme from "@/helpers/getResumeTheme";
import classicTemplate from "@/resume-engine/templates/classic.template.json";
import classicTheme from "@/resume-engine/templates/classic.theme.json";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";
import type { ResumeData } from "@/resume-engine/types/resume-data";

type Props = {
  params: { id: string } | Promise<{ id: string }>;
};

export function PdfPreviewContent({ params }: Props) {
  return (
    <Suspense fallback={<PdfLoading />}>
      <PdfContent params={params} />
    </Suspense>
  );
}

async function PdfContent({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const resolved = params instanceof Promise ? await params : params;
  const { id } = resolved;
  const profile = await getProfileById(id);
  const [templateDoc, themeDoc] = await Promise.all([
    getResumeTemplate(profile.template_id),
    getResumeTheme(profile.theme_id),
  ]);

  const html = renderResumeToHtmlDocument({
    templateDoc: templateDoc ?? (classicTemplate as unknown as TemplateDocument),
    themeDoc: themeDoc ?? (classicTheme as unknown as ThemeDocument),
    data: profile as ResumeData,
  });

  const response = await generatePdfFromHtml(html);

  if (!response.success || !response.data) {
    throw new Error(response.message || "Failed to generate PDF");
  }

  return (
    <iframe
      src={response.data}
      className="w-full h-full border-0"
    />
  );
}

function PdfLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-black" />
    </div>
  );
}
