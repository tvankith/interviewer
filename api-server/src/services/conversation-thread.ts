import { ConversationThreadRepository } from '../repositories/conversation-thread';
import { env } from '../config/env';
import type {
  ConversationThread,
  CreateConversationThreadFromWebhookInput,
  ThreadMessagesResponse,
} from '../types';

export class ConversationThreadService {
  private repository: ConversationThreadRepository;

  constructor() {
    this.repository = new ConversationThreadRepository();
  }

  async registerThread(input: CreateConversationThreadFromWebhookInput): Promise<ConversationThread> {
    return this.repository.createFromWebhook(input);
  }

  async listThreads(userId: string, candidateProfileId: string): Promise<ConversationThread[]> {
    return this.repository.listByCandidate(candidateProfileId, userId);
  }

  async getThreadMessages(
    userId: string,
    candidateProfileId: string,
    threadId: string,
    accessToken: string,
  ): Promise<ThreadMessagesResponse | null> {
    const thread = await this.repository.findByThreadId(threadId, candidateProfileId, userId);
    if (!thread) return null;
    const response = await fetch(`${env.aiServerUrl}/api/agent/threads/${threadId}/messages`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`ai-server returned ${response.status} fetching thread messages`);
    }

    return response.json();
  }
}
