import { Suspense } from "react";
import { getProfileById } from "@/apis/profile";
import { generatePdfFromHtml } from "@/app/(dashboard)/profiles/actions";
import Handlebars from "handlebars";
import { mapProfileToResume } from "@/app/(dashboard)/profiles/helpers/map-profile-to-resume";
import getDefaultResumeTemplate from "@/helpers/getDefaultResumeTemplate";

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
  const [profile, template] = await Promise.all([
    getProfileById(id),
    Promise.resolve(getDefaultResumeTemplate()),
  ]);

  const compiled = Handlebars.compile(template);
  const data = mapProfileToResume(profile);
  const html = compiled(data);

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
