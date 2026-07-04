import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { ChipInput } from '.'

const meta: Meta<typeof ChipInput> = {
  title: 'Prime/Patterns/ChipInput',
  component: ChipInput,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof ChipInput>

function Controlled({ initial = [], placeholder }: { initial?: string[]; placeholder?: string }) {
  const [value, setValue] = useState<string[]>(initial)
  return (
    <div className="w-80">
      <ChipInput value={value} onChange={setValue} placeholder={placeholder} />
    </div>
  )
}

export const Empty: Story = {
  render: () => <Controlled />,
}

export const WithInitialChips: Story = {
  render: () => <Controlled initial={['React', 'TypeScript', 'Node.js']} />,
}

export const CustomPlaceholder: Story = {
  render: () => <Controlled placeholder="Add a skill..." />,
}
