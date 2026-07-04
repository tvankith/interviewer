import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '.'
import { PlusIcon, TrashIcon, ArrowRightIcon } from 'lucide-react'

const meta: Meta<typeof Button> = {
  title: 'Prime/Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: { children: 'Button', variant: 'default' },
}

export const Outline: Story = {
  args: { children: 'Outline', variant: 'outline' },
}

export const Secondary: Story = {
  args: { children: 'Secondary', variant: 'secondary' },
}

export const Ghost: Story = {
  args: { children: 'Ghost', variant: 'ghost' },
}

export const Destructive: Story = {
  args: { children: 'Delete', variant: 'destructive' },
}

export const Link: Story = {
  args: { children: 'Learn more', variant: 'link' },
}

export const WithLeadingIcon: Story = {
  args: {
    children: (
      <>
        <PlusIcon /> Create
      </>
    ),
    variant: 'default',
  },
}

export const WithTrailingIcon: Story = {
  args: {
    children: (
      <>
        Continue <ArrowRightIcon />
      </>
    ),
    variant: 'default',
  },
}

export const IconOnly: Story = {
  args: {
    children: <TrashIcon />,
    variant: 'outline',
    size: 'icon',
    'aria-label': 'Delete',
  },
}

export const Disabled: Story = {
  args: { children: 'Disabled', disabled: true },
}

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const).map((v) => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </div>
  ),
}

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {(['xs', 'sm', 'default', 'lg'] as const).map((s) => (
        <Button key={s} size={s}>{s}</Button>
      ))}
    </div>
  ),
}
