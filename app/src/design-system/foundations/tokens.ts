/**
 * Prime Design System — Foundations: Tokens
 *
 * Maps semantic token names to their CSS custom-property references.
 * All values resolve at runtime via the globals.css @theme block.
 * Use these constants wherever you need a token name as a string (e.g. in tests
 * or dynamic style generation) — for Tailwind classes just use the class names directly.
 */

export const colorTokens = {
  // Surfaces
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  card: 'var(--card)',
  cardForeground: 'var(--card-foreground)',
  popover: 'var(--popover)',
  popoverForeground: 'var(--popover-foreground)',

  // Brand
  primary: 'var(--primary)',
  primaryForeground: 'var(--primary-foreground)',

  // Neutral
  secondary: 'var(--secondary)',
  secondaryForeground: 'var(--secondary-foreground)',
  muted: 'var(--muted)',
  mutedForeground: 'var(--muted-foreground)',
  accent: 'var(--accent)',
  accentForeground: 'var(--accent-foreground)',

  // State
  destructive: 'var(--destructive)',
  border: 'var(--border)',
  input: 'var(--input)',
  ring: 'var(--ring)',

  // Data viz
  chart1: 'var(--chart-1)',
  chart2: 'var(--chart-2)',
  chart3: 'var(--chart-3)',
  chart4: 'var(--chart-4)',
  chart5: 'var(--chart-5)',

  // Sidebar
  sidebar: 'var(--sidebar)',
  sidebarForeground: 'var(--sidebar-foreground)',
  sidebarPrimary: 'var(--sidebar-primary)',
  sidebarPrimaryForeground: 'var(--sidebar-primary-foreground)',
  sidebarAccent: 'var(--sidebar-accent)',
  sidebarAccentForeground: 'var(--sidebar-accent-foreground)',
  sidebarBorder: 'var(--sidebar-border)',
  sidebarRing: 'var(--sidebar-ring)',
} as const

export const radiusTokens = {
  sm: 'var(--radius-sm)',   // calc(--radius * 0.6)
  md: 'var(--radius-md)',   // calc(--radius * 0.8)
  lg: 'var(--radius-lg)',   // --radius (0.625rem)
  xl: 'var(--radius-xl)',   // calc(--radius * 1.4)
  '2xl': 'var(--radius-2xl)',
  '3xl': 'var(--radius-3xl)',
  '4xl': 'var(--radius-4xl)',
} as const

export const fontTokens = {
  sans: 'var(--font-sans)',
  mono: 'var(--font-geist-mono)',
  heading: 'var(--font-sans)',
} as const

export type ColorToken = keyof typeof colorTokens
export type RadiusToken = keyof typeof radiusTokens
export type FontToken = keyof typeof fontTokens
