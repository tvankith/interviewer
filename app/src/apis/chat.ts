import { axiosInstance, aiServerAxiosInstance } from "./axios-instances";

export type ChatRequest = {
  message: string;
  question_id: string;
};

export type ChatResponse = {
  question_id: string;
  interviewer_message: string;
  is_follow_up: boolean;
};

export async function sendChat(
  payload: ChatRequest
): Promise<ChatResponse> {
  const response = await axiosInstance.post(
    "/api/agent/chat",
    payload
  );
  return response.data;
}

// Agent endpoint for resume improvements
export type ProposalOutcome = {
  proposal_id: string;
  approved: boolean;
};

export type AgentRequest = {
  candidate_id: string;
  message?: string;
  session_id?: string;
  proposal_outcome?: ProposalOutcome;
};

export type Proposal = {
  id: string;
  proposed_fields: Record<string, unknown>;
};

export type AgentResponse = {
  session_id: string;
  result: string;
  proposals: Proposal[];
};

export async function sendAgentMessage(
  payload: AgentRequest
): Promise<AgentResponse> {
  const response = await aiServerAxiosInstance.post("/api/agent", payload);
  return response.data;
}