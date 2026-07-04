import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
  MessageToolbar,
} from '.'
import { CopyIcon, ThumbsUpIcon, ThumbsDownIcon, RefreshCwIcon } from 'lucide-react'

const meta: Meta = {
  title: 'Prime/AI/Message',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj

export const AssistantMessage: Story = {
  name: 'Assistant Message',
  render: () => (
    <div className="max-w-2xl space-y-4">
      <Message from="assistant">
        <MessageContent>
          Here is a concise explanation of how React hooks work under the hood.
          The reconciler tracks hook call order per fiber, so the rules of hooks
          (no conditionals, no loops) are enforced structurally.
        </MessageContent>
        <MessageToolbar>
          <MessageActions>
            <MessageAction tooltip="Copy" onClick={() => {}}>
              <CopyIcon size={14} />
            </MessageAction>
            <MessageAction tooltip="Good response" onClick={() => {}}>
              <ThumbsUpIcon size={14} />
            </MessageAction>
            <MessageAction tooltip="Bad response" onClick={() => {}}>
              <ThumbsDownIcon size={14} />
            </MessageAction>
            <MessageAction tooltip="Regenerate" onClick={() => {}}>
              <RefreshCwIcon size={14} />
            </MessageAction>
          </MessageActions>
        </MessageToolbar>
      </Message>
    </div>
  ),
}

export const UserMessage: Story = {
  name: 'User Message',
  render: () => (
    <div className="max-w-2xl">
      <Message from="user">
        <MessageContent>
          Can you explain how React reconciliation works?
        </MessageContent>
      </Message>
    </div>
  ),
}

export const Conversation: Story = {
  render: () => (
    <div className="max-w-2xl space-y-4">
      <Message from="user">
        <MessageContent>What is a LangGraph state machine?</MessageContent>
      </Message>
      <Message from="assistant">
        <MessageContent>
          LangGraph is a library for building stateful, multi-actor applications
          with LLMs. It models agent workflows as directed graphs where each node
          is a callable that reads and writes to a shared state object.
        </MessageContent>
        <MessageToolbar>
          <MessageActions>
            <MessageAction tooltip="Copy" onClick={() => {}}>
              <CopyIcon size={14} />
            </MessageAction>
          </MessageActions>
        </MessageToolbar>
      </Message>
      <Message from="user">
        <MessageContent>How does it handle parallel branches?</MessageContent>
      </Message>
    </div>
  ),
}
