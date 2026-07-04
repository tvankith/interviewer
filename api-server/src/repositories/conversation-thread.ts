import { getDatabase } from '../db/connection';
import type { ConversationThread, CreateConversationThreadFromWebhookInput } from '../types';

export class ConversationThreadRepository {
  async createFromWebhook(input: CreateConversationThreadFromWebhookInput): Promise<ConversationThread> {
    const db = getDatabase();

    return db.conversation_thread.create({
      data: {
        thread_id: input.thread_id,
        candidate_profile_id: input.candidate_id,
      },
    });
  }

  async listByCandidate(candidateProfileId: string, userId: string): Promise<ConversationThread[]> {
    const db = getDatabase();

    // Verify profile ownership first
    const profile = await db.candidate_profile.findUnique({
      where: { id: candidateProfileId },
    });

    if (!profile || profile.user_id !== userId || profile.deleted_at) {
      return [];
    }

    return db.conversation_thread.findMany({
      where: { candidate_profile_id: candidateProfileId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByThreadId(
    threadId: string,
    candidateProfileId: string,
    userId: string,
  ): Promise<ConversationThread | null> {
    const db = getDatabase();

    // Verify profile ownership first
    const profile = await db.candidate_profile.findUnique({
      where: { id: candidateProfileId },
    });

    if (!profile || profile.user_id !== userId || profile.deleted_at) {
      return null;
    }

    const thread = await db.conversation_thread.findUnique({
      where: { thread_id: threadId },
    });

    if (!thread || thread.candidate_profile_id !== candidateProfileId) {
      return null;
    }

    return thread;
  }
}
