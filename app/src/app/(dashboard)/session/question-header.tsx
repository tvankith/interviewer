import { fetchQuestion } from "@/apis/queston";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

type Props = {
    questionId?: string;
    onIdealAnswerClick?: (questionId: string) => void;
};

const QuestionHeader = ({ questionId, onIdealAnswerClick }: Props) => {
    const { data: question, isLoading: questionLoading } = useQuery({
        queryKey: ["question", questionId],
        queryFn: () => {
            if (questionId) {
                return fetchQuestion(questionId);
            }
        },
        enabled: !!questionId,
    });

    const handleIdealAnswerClick = () => {
        if (questionId && onIdealAnswerClick) {
            onIdealAnswerClick(questionId);
        }
    };

    return (
        <Card className="shadow-sm border bg-muted/40">
            <CardContent className="px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-muted-foreground">
                        Question {question?.order_index}
                    </p>

                </div>

                <h2 className="text-lg font-semibold leading-relaxed">
                    {questionLoading
                        ? "Loading question..."
                        : question?.question_text}
                </h2>
                <button
                    onClick={handleIdealAnswerClick}
                    className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition"
                    disabled={!questionId}
                >
                    Ideal Answer
                </button>
            </CardContent>
        </Card>
    );
};

export default QuestionHeader;