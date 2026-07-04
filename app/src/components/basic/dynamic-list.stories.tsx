import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import DynamicList from './dynamic-list'

const meta: Meta<typeof DynamicList> = {
  title: 'Basic/DynamicList',
  component: DynamicList,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof DynamicList>

function Controlled(props: { label: string; initial?: string[] }) {
  const [values, setValues] = useState<string[]>(props.initial ?? [])
  return (
    <div className="w-80">
      <DynamicList label={props.label} values={values} setValues={setValues} />
    </div>
  )
}

export const Empty: Story = {
  render: () => <Controlled label="Responsibility" />,
}

export const WithValues: Story = {
  render: () => (
    <Controlled
      label="Requirement"
      initial={['3+ years React experience', 'TypeScript proficiency']}
    />
  ),
}
