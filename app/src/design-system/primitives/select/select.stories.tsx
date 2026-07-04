import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '.'

const meta: Meta<typeof Select> = {
  title: 'Prime/Primitives/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof Select>

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a role..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="engineer">Software Engineer</SelectItem>
        <SelectItem value="designer">Product Designer</SelectItem>
        <SelectItem value="pm">Product Manager</SelectItem>
        <SelectItem value="data">Data Scientist</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const WithGroups: Story = {
  name: 'With Groups',
  render: () => (
    <Select>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select experience level..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Junior</SelectLabel>
          <SelectItem value="intern">Intern</SelectItem>
          <SelectItem value="junior">Junior (0–2 yrs)</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Mid–Senior</SelectLabel>
          <SelectItem value="mid">Mid (2–5 yrs)</SelectItem>
          <SelectItem value="senior">Senior (5–8 yrs)</SelectItem>
          <SelectItem value="staff">Staff (8+ yrs)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
}

export const Small: Story = {
  render: () => (
    <Select>
      <SelectTrigger size="sm" className="w-40">
        <SelectValue placeholder="Difficulty..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="easy">Easy</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="hard">Hard</SelectItem>
      </SelectContent>
    </Select>
  ),
}
