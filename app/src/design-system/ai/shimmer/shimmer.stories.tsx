import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Shimmer } from '.'

const meta: Meta<typeof Shimmer> = {
  title: 'Prime/AI/Shimmer',
  component: Shimmer,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof Shimmer>

export const Default: Story = {
  render: () => (
    <div className="w-64 space-y-2">
      <Shimmer className="h-4 w-full rounded" />
      <Shimmer className="h-4 w-3/4 rounded" />
      <Shimmer className="h-4 w-5/6 rounded" />
    </div>
  ),
}
