"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  PromptInputProvider,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type ChatProposalFieldDiff = {
  field: string;
  before: unknown;
  after: unknown;
};

export type ChatProposal = {
  id: string;
  fields: ChatProposalFieldDiff[];
  status: "pending" | "approving" | "rejecting" | "approved" | "rejected";
};

export type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string | any[];
  proposals?: ChatProposal[];
};

export type ChatMode = {
  value: string;
  label: string;
};

const DEFAULT_MODES: ChatMode[] = []

type ChatProps = {
  messages: ChatMessage[];
  isStreaming?: boolean;
  onSend: (message: string, mode?: string) => void;
  placeholder?: string;
  className?: string;
  modes?: ChatMode[];
  defaultMode?: string;
  onApproveProposal?: (messageId: string, proposalId: string) => void;
  onRejectProposal?: (messageId: string, proposalId: string) => void;
};

function formatFieldValue(value: unknown): string {
  if (value === undefined || value === null) return "(empty)";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function ProposalCard({
  proposal,
  onApprove,
  onReject,
}: {
  proposal: ChatProposal;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="mt-2 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="space-y-2">
        {proposal.fields.map((diff) => (
          <div key={diff.field}>
            <div className="text-xs font-medium text-muted-foreground uppercase">
              {diff.field}
            </div>
            <div className="whitespace-pre-wrap text-red-600 line-through">
              {formatFieldValue(diff.before)}
            </div>
            <div className="whitespace-pre-wrap text-green-700">
              {formatFieldValue(diff.after)}
            </div>
          </div>
        ))}
      </div>

      {proposal.status === "pending" || proposal.status === "approving" || proposal.status === "rejecting" ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={proposal.status !== "pending"}
            className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {proposal.status === "approving" ? "Saving…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={proposal.status !== "pending"}
            className="rounded border px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            {proposal.status === "rejecting" ? "Declining…" : "Reject"}
          </button>
        </div>
      ) : (
        <div className="mt-3 text-xs font-medium text-muted-foreground">
          {proposal.status === "approved" ? "Approved and saved" : "Rejected"}
        </div>
      )}
    </div>
  );
}

export function Chat({
  messages,
  isStreaming = false,
  onSend,
  placeholder = "Say something...",
  className,
  modes = [],
  defaultMode,
  onApproveProposal,
  onRejectProposal,
}: ChatProps) {
  const [input, setInput] = useState("");
  const [selectedMode, setSelectedMode] = useState<string>(
    defaultMode ?? modes[0]?.value ?? "answer"
  );

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text) return;

    onSend(message.text, selectedMode);
    setInput("");
  };

  const getMessageText = (content: string | any[]): string => {
    if (typeof content === "string") return content;

    if (Array.isArray(content)) {
      return content
        .map((block) =>
          typeof block === "string" ? block : block.text || ""
        )
        .join("");
    }

    return "";
  };

  return (
    <div className={`mx-auto w-full rounded-lg ${className}`}>
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent>
            {!isStreaming && messages.length === 0 ? (
              <ConversationEmptyState
                icon={<MessageSquare className="size-12" />}
                title="Start a conversation"
                description="Type a message below to begin chatting"
              />
            ) : (
              messages.map((message, index) => (
                <Message from={message.role} key={message.id || index}>
                  <MessageContent>
                    <MessageResponse>
                      {getMessageText(message.content)}
                    </MessageResponse>
                    {message.proposals?.map((proposal) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        onApprove={() =>
                          onApproveProposal?.(message.id ?? "", proposal.id)
                        }
                        onReject={() =>
                          onRejectProposal?.(message.id ?? "", proposal.id)
                        }
                      />
                    ))}
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>

          <ConversationScrollButton />
        </Conversation>

        <PromptInputProvider>
          <PromptInput
            onSubmit={handleSubmit}
            className="mt-4 w-full max-w-2xl mx-auto"
          >
            <PromptInputTextarea
              value={input}
              placeholder={placeholder}
              onChange={(e) => setInput(e.currentTarget.value)}
            />

            <PromptInputFooter>
              <div className="flex items-center gap-1">
                {modes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setSelectedMode(mode.value)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                      selectedMode === mode.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <PromptInputSubmit
                status={isStreaming ? "streaming" : "ready"}
                disabled={!input.trim()}
              />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </div>
    </div>
  );
}