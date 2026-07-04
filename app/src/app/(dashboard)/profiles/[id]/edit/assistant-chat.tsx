"use client"
import { Chat, type ChatMessage } from "@/components/basic/chat";
import { cn } from "@/lib/utils";

type Props = {
    messages: ChatMessage[];
    isLoading: boolean;
    onSend: (text: string, mode?: string) => Promise<void>;
    className?: string;
};

export default function AssistantChat({ messages, isLoading, onSend, className }: Props) {
    return (
        <Chat
            className={cn(className)}
            messages={messages}
            isStreaming={isLoading}
            onSend={onSend}
            placeholder="Ask me to update your profile..."
            defaultMode="review_resume:"
        />
    );
}
