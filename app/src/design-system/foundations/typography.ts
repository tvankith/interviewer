/**
 * Prime Design System — Foundations: Typography
 *
 * Font-scale and weight constants that mirror the Tailwind CSS v4 type scale
 * used across the app. Import these when you need the raw values (e.g. Canvas
 * rendering, PDF generation) — for Tailwind classes use `text-xs`, `text-sm`, etc.
 */

export const fontSize = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem',
  '4xl': '2.25rem',
} as const

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const

/** Semantic text styles used across the Prime design system */
export const textStyles = {
  /** Page and section headings */
  heading: {
    fontFamily: 'var(--font-heading)',
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.snug,
  },
  /** Default body copy */
  body: {
    fontFamily: 'var(--font-sans)',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  /** Small labels, captions, metadata */
  caption: {
    fontFamily: 'var(--font-sans)',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  /** Monospaced code snippets */
  code: {
    fontFamily: 'var(--font-mono)',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
  },
} as const

export type FontSize = keyof typeof fontSize
export type FontWeight = keyof typeof fontWeight
export type TextStyle = keyof typeof textStyles
