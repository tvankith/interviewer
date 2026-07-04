import { axiosInstance } from "./axios-instances";

export type QuestionBankItem = {
    id: string;
    question_text: string;
    topic: string | null;
    difficulty: string | null;
    role: string | null;
    experience_level: string | null;
    skill_tags: string[] | null;
    ideal_answer: string | null;
    expected_signals: string[] | null;
    source: string | null;
    use_count: number;
    has_embedding: boolean;
    created_by: string | null;
};

export type QuestionBankListParams = {
    role?: string;
    difficulty?: string;
    experience_level?: string;
    mine_only?: boolean;
    limit?: number;
    offset?: number;
};

export const fetchQuestionBank = async (
    params: QuestionBankListParams = {}
): Promise<QuestionBankItem[]> => {
    const { data } = await axiosInstance.get("/api/question-bank", { params });
    return data;
};

export const searchQuestionBank = async (params: {
    q: string;
    k?: number;
    role?: string;
    experience_level?: string;
}): Promise<QuestionBankItem[]> => {
    const { data } = await axiosInstance.get("/api/question-bank/search", { params });
    return data;
};

export const createQuestionBankItem = async (payload: {
    question_text: string;
    topic?: string;
    difficulty?: string;
    role?: string;
    experience_level?: string;
    skill_tags?: string[];
    ideal_answer?: string;
    expected_signals?: string[];
    source?: string;
}): Promise<QuestionBankItem> => {
    const { data } = await axiosInstance.post("/api/question-bank", payload);
    return data;
};

export const deleteQuestionBankItem = async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/question-bank/${id}`);
};
