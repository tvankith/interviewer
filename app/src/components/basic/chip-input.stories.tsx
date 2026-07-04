import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import ChipInput from './chip-input'

const meta: Meta<typeof ChipInput> = {
  title: 'Basic/ChipInput',
  component: ChipInput,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ChipInput>

function Controlled(props: { initial?: string[]; placeholder?: string }) {
  const [value, setValue] = useState<string[]>(props.initial ?? [])
  return (
    <div className="w-80">
      <ChipInput value={value} onChange={setValue} placeholder={props.placeholder} />
    </div>
  )
}

export const Empty: Story = {
  render: () => <Controlled />,
}

export const WithInitialChips: Story = {
  render: () => (
    <Controlled initial={['React', 'TypeScript', 'Node.js']} />
  ),
}

export const CustomPlaceholder: Story = {
  render: () => (
    <Controlled placeholder="Add a skill..." />
  ),
}
