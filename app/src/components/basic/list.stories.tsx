import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import List from './list'

const meta: Meta<typeof List> = {
  title: 'Basic/List',
  component: List,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof List>

type Profile = { name: string; role: string }

export const WithItems: Story = {
  render: () => (
    <div className="w-80">
      <List<Profile>
        data={[
          { name: 'Jane Doe', role: 'Senior Frontend Engineer' },
          { name: 'John Smith', role: 'Backend Engineer' },
          { name: 'Alice Kim', role: 'Full Stack Developer' },
        ]}
        renderItem={(item) => (
          <div className="rounded-lg border px-4 py-3">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">{item.role}</p>
          </div>
        )}
      />
    </div>
  ),
}

export const EmptyState: Story = {
  render: () => (
    <div className="w-80">
      <List data={[]} renderItem={() => null} />
    </div>
  ),
}

export const CustomEmptyState: Story = {
  render: () => (
    <div className="w-80">
      <List
        data={[]}
        renderItem={() => null}
        emptyState={
          <p className="text-sm text-muted-foreground">No profiles yet. Create one to get started.</p>
        }
      />
    </div>
  ),
}
