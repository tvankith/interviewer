import axios, { AxiosResponse } from "axios";
import { axiosInstance } from "./axios-instances";

export interface Question {
    question_id: string
    question_text: string
    topic: string
    difficulty: string
    order: number
    parent_question_id: any
    answer: any
    followups: any[]
}

export interface ChatRequest {
    answer: string
    message: string
    question_id: string
    session_id: string
}

export type Session = {
    id: string;
    candidate_profile_id: string;
    created_at: string;
    ended_at: string | null;
    user_id: string;
    job_requirement_id: string;
    status: "in_progress" | "completed" | string;
    current_question_id: string;
    started_at: string;
    gap_analysis_id: string | null;
};

export async function fetchSession(session_id: string): Promise<Session> {
    const response = await axiosInstance.get(
        '/api/session',
        {
            params: { session_id },
            headers: {
                accept: "application/json",
            },
        }
    );

    return response.data;
}

export const createSession = async (payload: {
    candidate_profile_id: string;
    job_requirement_id: string;
}) => {
    const res = await axiosInstance.post("/api/session", payload);
    return res.data;
};

export async function startSession(sessionId: string): Promise<void> {
    await axiosInstance.post(`/api/session/${sessionId}/start`);
}