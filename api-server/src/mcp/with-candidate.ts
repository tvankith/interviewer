import { AsyncLocalStorage } from 'node:async_hooks';
import type { PrismaClient, candidate_profile } from '@prisma/client';

export type RequestStore = { candidateId: string };
export const requestStore = new AsyncLocalStorage<RequestStore>();

export type CandidateContext = {
  candidate: candidate_profile;
  prisma: PrismaClient;
};

export type ToolResult = Record<string, unknown>;

export async function withCandidate(
  prisma: PrismaClient,
  fn: (ctx: CandidateContext) => Promise<ToolResult>
): Promise<ToolResult> {
  const store = requestStore.getStore();
  const candidateId = store?.candidateId;

  if (!candidateId) {
    return { error: 'candidate_id not provided in request context' };
  }

  const candidate = await prisma.candidate_profile.findFirst({
    where: { id: candidateId, deleted_at: null },
  });

  if (!candidate) {
    return { error: `Candidate profile with id ${candidateId} not found` };
  }

  return fn({ candidate, prisma });
}
