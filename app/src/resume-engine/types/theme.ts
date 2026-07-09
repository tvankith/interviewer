import type { SpacingToken, TypographyToken } from "./template";

export interface ThemeDocument {
  schemaVersion: 1;
  id: string;
  name: string;
  fonts: {
    base: string;
    heading?: string;
    googleFontsUrl?: string;
  };
  colors: {
    text: string;
    muted: string;
    light: string;
    line: string;
    pillBg: string;
    pillBorder: string;
  };
  sizes: Record<TypographyToken, string>;
  spacing: Record<SpacingToken, string>;
  borders: {
    radius: string;
    width: string;
  };
  page: {
    background: string;
    maxWidth: string;
    /** Fixed page width (e.g. A4's 210mm ≈ 794px @96dpi) used by the interactive preview's pagination. */
    width: string;
    /** Fixed page height (e.g. A4's 297mm ≈ 1123px @96dpi) used by the interactive preview's pagination. */
    height: string;
    padding: string;
  };
}

/** Flat CSS custom properties resolved from a ThemeDocument, applied on the render root. */
export type ResolvedTheme = Record<string, string>;
