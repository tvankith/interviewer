import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { colorTokens, radiusTokens, fontTokens } from './tokens'
import { fontSize, fontWeight, textStyles } from './typography'

const meta: Meta = {
  title: 'Prime/Foundations/Tokens',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj

// ---------------------------------------------------------------------------
// Color Palette
// ---------------------------------------------------------------------------

export const Colors: Story = {
  name: 'Color Tokens',
  render: () => (
    <div className="space-y-6">
      <h2 className="text-base font-medium">Color Tokens</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(colorTokens).map(([name, value]) => (
          <div key={name} className="space-y-1.5">
            <div
              className="h-12 w-full rounded-lg border border-border ring-1 ring-foreground/5"
              style={{ background: value }}
            />
            <p className="text-xs font-mono text-muted-foreground">{name}</p>
            <p className="text-xs text-muted-foreground/70 truncate">{value}</p>
          </div>
        ))}
      </div>
    </div>
  ),
}

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------

export const Radii: Story = {
  name: 'Radius Tokens',
  render: () => (
    <div className="space-y-6">
      <h2 className="text-base font-medium">Radius Tokens</h2>
      <div className="flex flex-wrap gap-4">
        {Object.entries(radiusTokens).map(([name, value]) => (
          <div key={name} className="flex flex-col items-center gap-2">
            <div
              className="h-16 w-16 border-2 border-primary bg-primary/10"
              style={{ borderRadius: value }}
            />
            <p className="text-xs font-mono text-muted-foreground">{name}</p>
          </div>
        ))}
      </div>
    </div>
  ),
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const TypeScale: Story = {
  name: 'Type Scale',
  render: () => (
    <div className="space-y-6">
      <h2 className="text-base font-medium">Font Sizes</h2>
      <div className="space-y-3">
        {Object.entries(fontSize).map(([name, value]) => (
          <div key={name} className="flex items-baseline gap-4">
            <span className="w-10 shrink-0 text-xs font-mono text-muted-foreground">{name}</span>
            <span style={{ fontSize: value }}>The quick brown fox</span>
            <span className="text-xs text-muted-foreground/60">{value}</span>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const TextStyles: Story = {
  name: 'Text Styles',
  render: () => (
    <div className="space-y-6">
      <h2 className="text-base font-medium">Semantic Text Styles</h2>
      <div className="space-y-4">
        {Object.entries(textStyles).map(([name, style]) => (
          <div key={name} className="flex items-baseline gap-4">
            <span className="w-20 shrink-0 text-xs font-mono text-muted-foreground">{name}</span>
            <span style={style as React.CSSProperties}>
              The quick brown fox jumps over the lazy dog
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
}

export const FontWeights: Story = {
  name: 'Font Weights',
  render: () => (
    <div className="space-y-6">
      <h2 className="text-base font-medium">Font Weights</h2>
      <div className="space-y-3">
        {Object.entries(fontWeight).map(([name, value]) => (
          <div key={name} className="flex items-baseline gap-4">
            <span className="w-20 shrink-0 text-xs font-mono text-muted-foreground">{name}</span>
            <span className="text-base" style={{ fontWeight: value }}>
              The quick brown fox
            </span>
            <span className="text-xs text-muted-foreground/60">{value}</span>
          </div>
        ))}
      </div>
    </div>
  ),
}
