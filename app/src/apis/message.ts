import { axiosInstance } from "./axios-instances";

export type Message = {
  id: string;
  content: string;
  sender_type: "human" | "ai";
  created_at: string;
  thread_id: string;
  extra_data: any;
};

export async function fetchMessages(threadId: string): Promise<Message[]> {
  const response = await axiosInstance(
    `/api/message/thread/${threadId}`,
    {
      headers: {
        accept: "application/json",
      },
    }
  );

  return response.data;
}