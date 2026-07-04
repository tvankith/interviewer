"use client";

import { Chat, ChatMessage } from "@/components/basic/chat";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { fetchSession } from "@/apis/session";
import { fetchMessages, Message } from "@/apis/message";
import { fetchQuestion } from "@/apis/queston";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendChat } from "@/apis/chat";
import QuestionHeader from "../question-header";
import { IdealAnswerPanel } from "../idea-answer-panel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { startSession } from "@/apis/session"; // you need to implement this

export default function SessionPage() {
    const params = useParams<{ session_id: string }>();
    const sessionId = params.session_id;
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    // ✅ Session
    const { data: session } = useQuery({
        queryKey: ["session", sessionId],
        queryFn: () => fetchSession(sessionId),
        enabled: !!sessionId,
    });

    // ✅ Question
    const { data: question, isLoading: questionLoading } = useQuery({
        queryKey: ["question", session?.current_question_id],
        queryFn: () =>
            fetchQuestion(session!.current_question_id),
        enabled: !!session?.current_question_id,
    });

    const threadId = question?.thread_id

    // ✅ Messages
    const { data: messagesData, isLoading: messagesLoading } = useQuery({
        queryKey: ["messages", threadId],
        queryFn: () => {
            if (threadId)
                return fetchMessages(threadId)
        },
        enabled: !!threadId,
    });
    
    // mutation
    const { mutate: startInterview, isPending: isStarting } = useMutation({
        mutationFn: () => startSession(sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["session", sessionId],
            });
        },
    });

    const { mutate: sendMessage, isPending } = useMutation({
        mutationFn: sendChat,

        onSuccess: (data) => {
            if (data.question_id != question?.id) {
                queryClient.invalidateQueries({
                    queryKey: ["session", sessionId],
                });
                return
            }
            queryClient.invalidateQueries({
                queryKey: ["messages", threadId],
            });

            queryClient.invalidateQueries({
                queryKey: ["question"],
            });
        },
    });

    // ✅ Mapper
    const chatMessages: ChatMessage[] =
        messagesData?.map((msg: Message) => ({
            id: msg.id,
            content: msg.content,
            role: msg.sender_type === "human" ? "user" : "assistant",
        })) ?? [];

        if (!session?.current_question_id) {
            return (
                <div className="flex items-center justify-center h-full w-full">
                    <Card className="w-full max-w-md text-center">
                        <CardContent className="p-6 flex flex-col gap-4">
                            <h2 className="text-xl font-semibold">
                                Ready to start your interview?
                            </h2>
        
                            <p className="text-sm text-muted-foreground">
                                Click below to begin your session. Your first question will appear immediately.
                            </p>
        
                            <Button
                                onClick={() => startInterview()}
                                disabled={isStarting}
                                className="w-full"
                            >
                                {isStarting ? "Starting..." : "Start Interview"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

    if (question?.id) {
        return (
            <div className="flex flex-col h-full w-full mx-auto p-4 gap-4">
    
                {/* ✅ Question */}
    
                <QuestionHeader
                    questionId={question?.id}
                    onIdealAnswerClick={() => setOpen(true)}
                />
    
                <IdealAnswerPanel
                    questionId={question?.id}
                    open={open}
                    onOpenChange={setOpen}
                />
    
                {/* ✅ Chat */}
                <div className="flex-1 min-h-0">
                    <Chat
                        messages={chatMessages}
                        isStreaming={isPending}
                        onSend={(message) => {
                            if (!question?.id) return;
    
                            sendMessage({
                                message,
                                question_id: question.id,
                            });
                        }}
                        placeholder="Type your answer or ask for help..."
                    />
                </div>
            </div>
        );
    }
}