// services/api.ts

import { API_URL } from "@/config";

export const fetchThreadsApi = async () => {
    const response = await fetch(`${API_URL}/api/threads`);
    if (!response.ok) throw new Error("Failed to fetch threads");
    return response.json();
};

export const deleteThreadApi = async (threadId: string) => {
    const response = await fetch(`${API_URL}/api/threads/${threadId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete thread');
    }
    return response.json();
};

export const fetchThreadMessageApi = async (threadId: string) => {
    const response = await fetch(`${API_URL}/api/messages/${threadId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch thread messages');
    }
    return response.json();
};

export const streamMessageApi = async (data: string, signal: AbortSignal) => {
    const response = await fetch(`${API_URL}/api/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to stream messages');
    }
    return response
};

// Prompt apis

type SavePromptPayload = {
    name?: string;
    role?: string;
    persona?: string;
    context?: string;
    instructions?: string[];
    constraints?: string[];
};

export const savePromptApi = async (data: SavePromptPayload) => {
    const res = await fetch(`${API_URL}/api/prompts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        throw new Error("Failed to save");
    }

    return res.json();
};


export interface PromptConfigResponse {
    role: string;
    persona: string;
    context: string;
    instructions: string[];
    output_format: string;
    temperature: number; // usually 0–1
    constraints: string[];
}

export const buildPromptApi = async (
    description: string
): Promise<PromptConfigResponse> => {
    const res = await fetch(`${API_URL}/agent/build_prompt`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ description }),
    });

    if (!res.ok) {
        throw new Error("Failed to reach build_prompt api");
    }

    const data = await res.json();

    return {
        role: data.role || "",
        persona: data.persona || "",
        context: data.context || "",
        instructions: Array.isArray(data.instructions)
            ? data.instructions
            : [],
        output_format: data.output_format || data.outputFormat || "",
        temperature:
            typeof data.temperature === "number"
                ? data.temperature
                : 0.3,
        constraints: Array.isArray(data.constraints)
            ? data.constraints
            : [],
    };
};