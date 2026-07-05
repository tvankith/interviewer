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
 * (print media query, page-break-inside).
 */
export function themeToCssText(theme: ThemeDocument): string {
  return `
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; }
    @media print {
      .resume-engine-page { padding: 0 !important; max-width: none !important; }
      .resume-engine-avoid-break { page-break-inside: avoid; }
    }
  `;
}

export function googleFontsLinkHref(theme: ThemeDocument): string | undefined {
  return theme.fonts.googleFontsUrl;
}
