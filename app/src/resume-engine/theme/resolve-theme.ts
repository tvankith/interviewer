import type { CSSProperties } from "react";
import type { ThemeDocument } from "../types/theme";

export function pageStyle(theme: ThemeDocument): CSSProperties {
  return {
    background: theme.page.background,
    maxWidth: theme.page.maxWidth,
    margin: "0 auto",
    padding: theme.page.padding,
    fontFamily: theme.fonts.base,
    color: theme.colors.text,
  };
}

export function headingFontFamily(theme: ThemeDocument): string {
  return theme.fonts.heading || theme.fonts.base;
}

/**
 * CSS text for the server-rendered static HTML document used by the PDF
 * path (render-static-html.ts) — inline styles handle everything else, this
 * only covers concerns that can't be expressed as a React inline style
 * (print media query, page-break-inside), plus hand-written equivalents of
 * every Tailwind utility class the resume-engine node components and
 * classic.template.json's `className` props reference. This document has no
 * Tailwind stylesheet of its own, so those class names are otherwise inert.
 */
export function themeToCssText(theme: ThemeDocument): string {
  return `
    * { box-sizing: border-box; }
    html, body { margin: 0; line-height: 1.5; }
    body { background: #fff; }
    h1, h2, h3, h4, h5, h6, p, ul, ol, li, blockquote, figure { margin: 0; }
    ul, ol { padding: 0; list-style: none; }

    .flex { display: flex; }
    .flex-row { flex-direction: row; }
    .flex-col { flex-direction: column; }
    .flex-wrap { flex-wrap: wrap; }
    .items-center { align-items: center; }
    .items-baseline { align-items: baseline; }
    .items-stretch { align-items: stretch; }
    .items-start { align-items: flex-start; }
    .self-stretch { align-self: stretch; }
    .min-w-0 { min-width: 0; }
    .w-full { width: 100%; }
    .object-cover { object-fit: cover; }
    .text-center { text-align: center; }
    .italic { font-style: italic; }
    .uppercase { text-transform: uppercase; }
    .tracking-widest { letter-spacing: 0.1em; }
    .list-disc { list-style-type: disc; }
    .pl-4 { padding-left: 1rem; }

    .resume-engine-richtext ul { list-style-type: disc; padding-left: 1.5rem; }
    .resume-engine-richtext ol { list-style-type: decimal; padding-left: 1.5rem; }
    .resume-engine-richtext ul > li + li,
    .resume-engine-richtext ol > li + li { margin-top: 0.25rem; }
    .resume-engine-richtext li { padding-left: 0.25rem; }

    @media print {
      .resume-engine-page { padding: 0 !important; max-width: none !important; }
      .resume-engine-avoid-break { page-break-inside: avoid; }
    }
  `;
}

export function googleFontsLinkHref(theme: ThemeDocument): string | undefined {
  return theme.fonts.googleFontsUrl;
}
