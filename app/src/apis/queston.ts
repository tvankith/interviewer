import { axiosInstance } from "./axios-instances";

export type Question = {
  id: string;
  difficulty: string;
  expected_signals: string | null;
  thread_id: string | null;
  interview_session_id: string;
  question_text: string;
  topic: string;
  order_index: number;
  created_at: string;
};

export async function fetchQuestion(questionId: string): Promise<Question> {
  const response = await axiosInstance.get(
    `/api/question/${questionId}`,
    {
      headers: {
        accept: "application/json",
      },
    }
  );

  return response.data;
}

export type IdealAnswerResponse = {
    ideal_answer: string;
  };
  
  export async function generateIdealAnswer(
    questionId: string
  ): Promise<IdealAnswerResponse> {
    const response = await axiosInstance.post(
      `/api/question/${questionId}/generate-ideal-answer`,
      {}
    );
  
    return response.data;
  }