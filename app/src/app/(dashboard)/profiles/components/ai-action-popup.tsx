"use client";

import { useState } from "react";
import { Chat, type ChatMessage } from "@/components/basic/chat";
import { AIActionDialog } from "./ai-action-dialog";
import { useResumeMCP } from "@/hooks/useResumeMCP";

interface AIActionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  action: {
    title: string;
    description: string;
    prompt: string;
    priority: "high" | "medium" | "low";
  };
  profileId: string;
}

export function AIActionPopup({
  isOpen,
  onClose,
  action,
  profileId,
}: AIActionPopupProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const { executeAction } = useResumeMCP(profileId);

  const handleSendMessage = async (message: string, mode?: string) => {
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    try {
      const prompt = mode && mode.includes(":")
        ? mode.replace(":", " ") + " " + message
        : message;

      const result = await executeAction.mutateAsync(prompt);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: result.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Failed to execute action:", err);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setMessages([]);
    }
  };

  return (
    <AIActionDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={action.title}
      description={action.description}
      priority={action.priority}
    >
      <div className="px-4 py-4 h-full">
        <Chat
          messages={messages}
          isStreaming={isStreaming}
          onSend={handleSendMessage}
          placeholder="Ask me anything about this action..."
          className="h-full"
          modes={[
            { value: "ask:", label: "Ask" },
            { value: "change_resume:", label: "Change" },
            { value: "rewrite:", label: "Rewrite" },
          ]}
          defaultMode="ask:"
        />
      </div>
    </AIActionDialog>
  );
}
