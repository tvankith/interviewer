"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteQuestionBankItem, QuestionBankItem } from "@/apis/question_bank";

const DIFFICULTY_COLORS: Record<string, string> = {
    easy: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    hard: "bg-red-100 text-red-800",
};

export default function QuestionBankItemCard({ item }: { item: QuestionBankItem }) {
    const queryClient = useQueryClient();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: () => deleteQuestionBankItem(item.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["question-bank"] });
        },
    });

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const confirmed = confirm("Delete this question?");
        if (!confirmed) return;
        await mutateAsync();
    };

    const difficultyClass =
        item.difficulty ? DIFFICULTY_COLORS[item.difficulty] ?? "bg-gray-100 text-gray-700" : "";

    return (
        <Card className="hover:shadow-md transition">
            <CardHeader>
                <CardTitle className="text-base leading-snug">
                    {item.question_text}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-1">
                    {item.difficulty && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyClass}`}>
                            {item.difficulty}
                        </span>
                    )}
                    {item.experience_level && (
                        <Badge variant="outline">{item.experience_level}</Badge>
                    )}
                    {item.role && (
                        <Badge variant="secondary">{item.role}</Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-2">
                {item.topic && (
                    <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Topic:</span> {item.topic}
                    </p>
                )}

                {item.skill_tags && item.skill_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {item.skill_tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}

                {item.ideal_answer && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.ideal_answer}
                    </p>
                )}
            </CardContent>

            <CardFooter className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                    Used {item.use_count} {item.use_count === 1 ? "time" : "times"}
                </span>

                {item.created_by && (
                    <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="text-xs text-red-500 hover:text-red-700"
                    >
                        {isPending ? "Deleting..." : "Delete"}
                    </button>
                )}
            </CardFooter>
        </Card>
    );
}
