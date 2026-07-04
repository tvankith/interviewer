import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import ResumeDropzone from './file-upload'

const meta: Meta<typeof ResumeDropzone> = {
  title: 'Basic/ResumeDropzone',
  component: ResumeDropzone,
  tags: ['autodocs'],
  argTypes: {
    isLoading: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof ResumeDropzone>

export const Default: Story = {
  args: {
    onFileSelect: (file) => alert(`Selected: ${file.name}`),
    isLoading: false,
  },
}

export const Loading: Story = {
  args: {
    onFileSelect: () => {},
    isLoading: true,
  },
}
