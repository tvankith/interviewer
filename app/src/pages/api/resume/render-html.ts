import type { NextApiRequest, NextApiResponse } from "next";
import { renderResumeToHtmlDocument } from "@/resume-engine/render/render-static-html";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";
import type { ResumeData } from "@/resume-engine/types/resume-data";

/**
 * Isolates the react-dom/server-based rendering behind a Pages Router API
 * route rather than an App Router Route Handler: App Router route.ts files
 * still compile under the RSC bundle layer, so react-dom/server is forbidden
 * there too. Pages Router API routes are the one layer (apiNode/apiEdge)
 * excluded from that restriction. Server Actions/Server Components must call
 * this via fetch() rather than importing render-static-html.ts directly.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { templateDoc, themeDoc, data } = req.body as {
    templateDoc: TemplateDocument;
    themeDoc: ThemeDocument;
    data: ResumeData;
  };

  const html = await renderResumeToHtmlDocument({ templateDoc, themeDoc, data });

  return res.status(200).json({ html });
}
