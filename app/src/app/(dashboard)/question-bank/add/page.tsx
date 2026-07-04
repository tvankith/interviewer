"use client";

import { useMutation } from "@tanstack/react-query";
import { createQuestionBankItem } from "@/apis/question_bank";
import { useRouter } from "next/navigation";
import QuestionBankForm from "../question-bank-form";

export default function AddQuestionPage() {
    const router = useRouter();

    const createQuestion = useMutation({
        mutationFn: createQuestionBankItem,
        onSuccess: () => {
            router.push("/question-bank");
        },
        onError: (err) => {
            console.error("Create failed", err);
        },
    });

    return (
        <QuestionBankForm
            onSubmit={(payload) => createQuestion.mutate(payload)}
            isLoading={createQuestion.isPending}
        />
    );
}
