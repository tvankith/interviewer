import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import SkillsBuilder, { type SkillGroup } from './skill-builder'

const meta: Meta<typeof SkillsBuilder> = {
  title: 'Basic/SkillsBuilder',
  component: SkillsBuilder,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SkillsBuilder>

function Controlled(props: { initial?: SkillGroup[] }) {
  const [value, setValue] = useState<SkillGroup[]>(props.initial ?? [])
  return (
    <div className="w-96">
      <SkillsBuilder value={value} onChange={setValue} />
    </div>
  )
}

export const Empty: Story = {
  render: () => <Controlled />,
}

export const WithCategories: Story = {
  render: () => (
    <Controlled
      initial={[
        { category: 'Frontend', skills: ['React', 'TypeScript', 'Tailwind CSS'] },
        { category: 'Backend', skills: ['Node.js', 'FastAPI'] },
      ]}
    />
  ),
}
