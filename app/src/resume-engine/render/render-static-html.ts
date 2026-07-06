import { renderToReadableStream } from "react-dom/server";
import "../registry/nodes";
import { RenderNode, type BindingScope } from "../registry/node-registry";
import { themeToCssText, googleFontsLinkHref } from "../theme/resolve-theme";
import type { ResumeData } from "../types/resume-data";
import type { TemplateDocument } from "../types/template";
import type { ThemeDocument } from "../types/theme";

/**
 * Server-only rendering for the PDF path: produces a full, self-contained
 * HTML document string (no hydration, no click-to-edit — mode="static" means
 * RenderNode never wraps anything in the client-only EditableOverlay). This
 * module must not import resume-canvas.tsx or editable-overlay.tsx, both of
 * which pull in Radix Popover / Lexical's React hooks.
 *
 * This module imports react-dom/server, so it must only ever be imported
 * from the /api/resume/render-html Route Handler — never from a Server
 * Action or Server Component, which sit in a webpack layer where Next.js
 * forbids importing react-dom/server at all.
 */
export async function renderResumeToHtmlDocument({
  templateDoc,
  themeDoc,
  data,
}: {
  templateDoc: TemplateDocument;
  themeDoc: ThemeDocument;
  data: ResumeData;
}): Promise<string> {
  const rootScope: BindingScope = { value: data };
  const stream = await renderToReadableStream(
    RenderNode({ node: templateDoc.root, scope: rootScope, resumeData: data, theme: themeDoc, mode: "static" })
  );
  const markup = await new Response(stream).text();

  const fontsUrl = googleFontsLinkHref(themeDoc);
  const fontLinks = fontsUrl
    ? `<link rel="preconnect" href="https://fonts.googleapis.com" />
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
       <link rel="stylesheet" href="${fontsUrl}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${fontLinks}
<style>${themeToCssText(themeDoc)}</style>
</head>
<body>
${markup}
</body>
</html>`;
}
