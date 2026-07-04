import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Input } from '.'

const meta: Meta<typeof Input> = {
  title: 'Prime/Primitives/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: { placeholder: 'Enter text...', className: 'w-72' },
}

export const WithValue: Story = {
  args: { value: 'John Doe', readOnly: true, className: 'w-72' },
}

export const Disabled: Story = {
  args: { placeholder: 'Disabled input', disabled: true, className: 'w-72' },
}

export const Invalid: Story = {
  args: { placeholder: 'Invalid input', 'aria-invalid': true, className: 'w-72' },
}

export const Password: Story = {
  args: { type: 'password', placeholder: 'Enter password', className: 'w-72' },
}
