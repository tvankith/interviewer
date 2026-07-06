"use server";

import { checkRateLimit } from "@/helpers/checkRateLimit";
import { headers, cookies } from "next/headers";
import getInternalBaseUrl from "@/helpers/getInternalBaseUrl";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";
import type { ResumeData } from "@/resume-engine/types/resume-data";

const PDF_API_URL = process.env.PDF_GENERATE_API_URL as string

export async function generatePdfFromHtml(html: string): Promise<{
  success: boolean,
  code?: string;
  message?: string;
  data?: string
}> {
  if (!html) {
    throw new Error("HTML is required");
  }

  // Use user IP as rate-limit key
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown";

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const isLoggedIn = !!accessToken;
  const limit = isLoggedIn ? 10 : 0;

  const allowed = await checkRateLimit(
    "pdf_export",
    ip,
    limit,
    60
  );

  if (!allowed) {
    return {
      success: false,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many PDF requests..."
    }
  }

  const response = await fetch(PDF_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html }),
  });

  if (!response.ok) {
    return {
      success: false,
      code: "PDF_GENERATION_FAILED",
      message: `PDF generation failed: ${response.statusText}`
    }
  }

  const data = await response.json();
  if (!data.url) {
    return {
      success: false,
      code: "NO_PDF_URL",
      message: "No PDF URL returned from API"
    }
  }

  return {
    success: true,
    data: data.url
  }
}

/**
 * Renders the resume to HTML and generates a PDF in one server-only call.
 * The actual rendering happens behind /api/resume/render-html rather than
 * via a direct import of render-static-html.ts: that module imports
 * react-dom/server, which Next.js forbids inside the RSC/action-browser
 * layer this Server Action runs in. Route Handlers use a different bundle
 * layer that's exempt from that restriction, so the render call is proxied
 * there over fetch() instead.
 */
export async function generateResumePdf({
  templateDoc,
  themeDoc,
  data,
}: {
  templateDoc: TemplateDocument;
  themeDoc: ThemeDocument;
  data: ResumeData;
}): ReturnType<typeof generatePdfFromHtml> {
  const renderResponse = await fetch(`${getInternalBaseUrl()}/api/resume/render-html`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateDoc, themeDoc, data }),
  });
  console.log("renderResponse", renderResponse)
  if (!renderResponse.ok) {
    return {
      success: false,
      code: "RENDER_FAILED",
      message: "Failed to render resume HTML",
    };
  }

  const { html } = (await renderResponse.json()) as { html: string };
  return generatePdfFromHtml(html);
}