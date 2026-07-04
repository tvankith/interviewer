"use client";

import { useEffect } from "react";
import { generateIdealAnswer } from "@/apis/queston";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useMutation } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    questionId?: string;
};

export function IdealAnswerPanel({
    open,
    onOpenChange,
    questionId,
}: Props) {
    const {
        mutate: fetchIdealAnswer,
        data,
        isPending,
        error,
        reset,
    } = useMutation({
        mutationFn: generateIdealAnswer,
    });

    // 🔥 Trigger API when panel opens
    useEffect(() => {
        if (open && questionId) {
            fetchIdealAnswer(questionId);
        }
    }, [open, questionId, fetchIdealAnswer]);

    // Optional: reset when closing
    useEffect(() => {
        if (!open) {
            reset();
        }
    }, [open, reset]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-100 sm:w-125">
                <SheetHeader>
                    <SheetTitle>Ideal Answer</SheetTitle>
                    <SheetDescription>
                        Review the suggested answer for this question.
                    </SheetDescription>
                </SheetHeader>

                <div className="px-3">
                    {/* Loading */}
                    {isPending && (
                        <p className="text-sm text-muted-foreground">
                            Generating ideal answer...
                        </p>
                    )}

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-500">
                            Failed to generate answer
                        </p>
                    )}

                    {/* Success */}
                    {data?.ideal_answer && (
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {data.ideal_answer}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}