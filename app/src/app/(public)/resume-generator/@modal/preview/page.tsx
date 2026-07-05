"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { generatePdfFromHtml } from "@/app/(dashboard)/profiles/actions";
import CloseButton from "@/app/(dashboard)/profiles/components/close-button";
import { renderResumeToHtmlDocument } from "@/resume-engine/render/render-static-html";
import classicTemplate from "@/resume-engine/templates/classic.template.json";
import classicTheme from "@/resume-engine/templates/classic.theme.json";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";
import type { ResumeData } from "@/resume-engine/types/resume-data";
import { getFromDB } from "@/lib/indexdb";

type Props = {
  searchParams: Promise<{ encoded: string }>;
};

export default function PreviewModal(props: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white w-[90%] h-[90%] rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center px-6 border-b h-16">
          <h2 className="font-semibold text-lg w-full text-center">
            PDF Preview
          </h2>
          <CloseButton />
        </div>

        {/* Suspense Content */}
        <Suspense fallback={<PdfLoading />}>
          <PdfContent />
        </Suspense>
      </div>
    </div>
  );
}

function PdfContent() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const generateAttempted = useRef(false);

  useEffect(() => {
    if (generateAttempted.current) return;
    generateAttempted.current = true;

    const generatePdf = async () => {
      try {
        const profileData = await getFromDB("profileDraft");
        if (!profileData) {
          setError({ message: "No resume data found. Please save your resume first." });
          return;
        }

        const html = renderResumeToHtmlDocument({
          templateDoc: classicTemplate as unknown as TemplateDocument,
          themeDoc: classicTheme as unknown as ThemeDocument,
          data: profileData as ResumeData,
        });

        const response = await generatePdfFromHtml(html);
        if (response.data) {
          setPdfUrl(response.data);
        }
        else {
          if (response?.message)
            setError({
              message: response?.message,
              code: response?.code
            })
        }
      } catch (err) {

      }
    };

    generatePdf();
  }, []);
  if (error) {
    console.log("error: ", error)
    const isRateLimit = error.code === "RATE_LIMIT_EXCEEDED";

    return (
      <div className="flex flex-col items-center justify-center h-[calc(100%-64px)] gap-6 px-6">
        {isRateLimit ? (
          <>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Preview Limit Reached</h3>
                <p className="text-gray-600 max-w-sm">
                  Limit will be reset in a few minutes or login to get unlimited resume preview and download
                </p>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap justify-center">
              <a
                href="/signin"
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
              >
                Sign In
              </a>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Something Went Wrong</h3>
              <p className="text-gray-600 max-w-sm">{error.message}</p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
          </>
        )}
      </div>
    );
  }

  if (!pdfUrl) {
    return <PdfLoading />;
  }

  return (
    <iframe
      src={pdfUrl}
      className="w-full h-[calc(100%-64px)] border-0"
    />
  );
}

function PdfLoading() {
  return (
    <div className="flex items-center justify-center h-[calc(100%-64px)]">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-black" />
    </div>
  );
}
