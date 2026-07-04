import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { StepNav } from '.'
import {
  User,
  AlignLeft,
  Cpu,
  Link2,
  GraduationCap,
  FolderOpen,
  Briefcase,
} from "lucide-react";

const meta: Meta<typeof StepNav> = {
  title: 'Prime/Patterns/StepNav',
  component: StepNav,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof StepNav>


const steps = [
  {
    id: "information", items: [
      { id: "basic", label: "Basic Info", Icon: User },
      { id: "summary", label: "Summary", Icon: AlignLeft },
      { id: "skills", label: "Skills", Icon: Cpu },
      { id: "links", label: "Links", Icon: Link2 },
      { id: "education", label: "Education", Icon: GraduationCap },
      { id: "projects", label: "Projects", Icon: FolderOpen },
      { id: "experience", label: "Experience", Icon: Briefcase },
    ]
  },
  {
    id: "design", items: [
      { id: "template", label: "Template", Icon: Briefcase },
    ]
  },
]
export const Default: Story = {
  render: () => {
    const [active, setActive] = useState('skills')
    return (
      <div className="w-64">
        <StepNav groups={steps} activeId={active} completedUpToIndex={1} onSelect={setActive} />
      </div>
    )
  },
}
