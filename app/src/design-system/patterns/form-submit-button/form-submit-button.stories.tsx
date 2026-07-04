import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { FormSubmitButton } from '.'

const meta: Meta<typeof FormSubmitButton> = {
  title: 'Prime/Patterns/FormSubmitButton',
  component: FormSubmitButton,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof FormSubmitButton>

export const Default: Story = {
  args: { children: 'Save Changes' },
}

export const Loading: Story = {
  args: { children: 'Saving...', isPending: true },
}

export const Simulated: Story = {
  name: 'Simulated Submit',
  render: () => {
    const [pending, setPending] = useState(false)
    const handleClick = () => {
      setPending(true)
      setTimeout(() => setPending(false), 2000)
    }
    return (
      <form onSubmit={(e) => { e.preventDefault(); handleClick() }}>
        <FormSubmitButton isPending={pending}>Submit Form</FormSubmitButton>
      </form>
    )
  },
}
