import { axiosInstance } from "./axios-instances";
import type { Proposal } from "./chat";

export type ConversationThread = {
  id: string;
  thread_id: string;
  candidate_profile_id: string;
  created_at: string;
};

export async function getConversationThreads(
  candidateProfileId: string
): Promise<ConversationThread[]> {
  const response = await axiosInstance.get<ConversationThread[]>(
    `/api/conversation-threads/${candidateProfileId}`
  );
  return Array.isArray(response.data) ? response.data : [];
}

export type ThreadTurn = {
  user_message: string;
  assistant_message: string;
  proposals: Proposal[];
};

export type ThreadMessagesResponse = {
  thread_id: string;
  messages: ThreadTurn[];
};

export async function getThreadMessages(
  candidateProfileId: string,
  threadId: string
): Promise<ThreadMessagesResponse> {
  const response = await axiosInstance.get<ThreadMessagesResponse>(
    `/api/conversation-threads/${candidateProfileId}/${threadId}/messages`
  );
  return response.data;
}
