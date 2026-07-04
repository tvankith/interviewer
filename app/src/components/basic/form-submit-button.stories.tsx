import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FormSubmitButton } from './form-submit-button'

const meta: Meta<typeof FormSubmitButton> = {
  title: 'Basic/FormSubmitButton',
  component: FormSubmitButton,
  tags: ['autodocs'],
  argTypes: {
    isLoading: { control: 'boolean' },
    text: { control: 'text' },
    loadingText: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof FormSubmitButton>

export const Default: Story = {
  args: {
    text: 'Submit',
  },
}

export const Loading: Story = {
  args: {
    text: 'Submit',
    isLoading: true,
    loadingText: 'Submitting...',
  },
}

export const CustomLabels: Story = {
  args: {
    text: 'Start Interview',
    loadingText: 'Starting...',
    isLoading: false,
  },
}
