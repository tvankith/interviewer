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

/**
 * "pending": not yet opened for review. "reviewing": the candidate has the
 * canvas diff open and is setting per-field/per-entry accept/reject
 * decisions there (see resume-engine/diff/use-proposal-review.ts) — this
 * card no longer does its own approve/reject, it only launches that review.
 * "submitting": the batched PATCH from "done reviewing" is in flight.
 * "done": the reconciled result has been saved (whether or not any
 * individual unit was actually accepted).
 */
export type ChatProposal = {
  id: string;
  fields: ChatProposalFieldDiff[];
  status: "pending" | "reviewing" | "submitting" | "done";
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
  /** Opens (or refocuses) the canvas diff review for this proposal. */
  onReviewProposal?: (messageId: string, proposalId: string) => void;
};

function formatFieldValue(value: unknown): string {
  if (value === undefined || value === null) return "(empty)";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function ProposalCard({
  proposal,
  onReview,
}: {
  proposal: ChatProposal;
  onReview: () => void;
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

      <div className="mt-3">
        <button
          type="button"
          onClick={onReview}
          disabled={proposal.status === "submitting" || proposal.status === "done"}
          className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {proposal.status === "pending" && "Review in resume"}
          {proposal.status === "reviewing" && "Reviewing…"}
          {proposal.status === "submitting" && "Saving…"}
          {proposal.status === "done" && "Reviewed"}
        </button>
      </div>
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
  onReviewProposal,
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
                        onReview={() =>
                          onReviewProposal?.(message.id ?? "", proposal.id)
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