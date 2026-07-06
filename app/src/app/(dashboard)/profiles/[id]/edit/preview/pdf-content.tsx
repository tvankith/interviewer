import { Suspense } from "react";
import { getProfileById } from "@/apis/profile";
import { generatePdfFromHtml } from "@/app/(dashboard)/profiles/actions";
import getInternalBaseUrl from "@/helpers/getInternalBaseUrl";
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

  const renderResponse = await fetch(`${getInternalBaseUrl()}/api/resume/render-html`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templateDoc: templateDoc ?? (classicTemplate as unknown as TemplateDocument),
      themeDoc: themeDoc ?? (classicTheme as unknown as ThemeDocument),
      data: profile as ResumeData,
    }),
  });

  if (!renderResponse.ok) {
    throw new Error("Failed to render resume HTML");
  }

  const { html } = (await renderResponse.json()) as { html: string };

  const response = await generatePdfFromHtml(html);

  if (!response.success || !response.data) {
    throw new Error(response.message || "Failed to generate PDF");
  }

  return (
    <div className="relative w-full h-full">
      <a
        href={`/api/pdf/download?url=${encodeURIComponent(response.data)}`}
        download
        className="absolute top-3 right-3 z-10 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 active:bg-blue-800 transition-colors"
      >
        Download PDF
      </a>
      <iframe
        src={response.data}
        className="w-full h-full border-0"
      />
    </div>
  );
}

function PdfLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-black" />
    </div>
  );
}
