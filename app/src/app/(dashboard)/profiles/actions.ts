"use server";

import { checkRateLimit } from "@/helpers/checkRateLimit";
import { headers, cookies } from "next/headers";

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