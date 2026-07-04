import { getDatabase } from '../db/connection';
import type { CandidateProfile, CreateProfileInput, UpdateProfileInput, ListOptions, ListResult } from '../types';

export class ProfileRepository {
  async create(userId: string, input: CreateProfileInput): Promise<CandidateProfile> {
    const db = getDatabase();
    return db.candidate_profile.create({
      data: {
        user_id: userId,
        ...input,
      },
    });
  }

  async getById(id: string, userId: string): Promise<CandidateProfile | null> {
    const db = getDatabase();
    const profile = await db.candidate_profile.findUnique({
      where: { id },
    });

    if (!profile) return null;
    if (profile.user_id !== userId) return null;
    if (profile.deleted_at) return null;

    return profile;
  }

  async findByUserIdAndId(userId: string, profileId: string): Promise<CandidateProfile | null> {
    const db = getDatabase();
    const profile = await db.candidate_profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) return null;
    if (profile.user_id !== userId) return null;
    if (profile.deleted_at) return null;

    return profile;
  }

  async update(id: string, userId: string, input: UpdateProfileInput): Promise<CandidateProfile | null> {
    const db = getDatabase();
    const existing = await db.candidate_profile.findUnique({ where: { id } });

    if (!existing || existing.user_id !== userId || existing.deleted_at) {
      return null;
    }

    return db.candidate_profile.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const db = getDatabase();
    const existing = await db.candidate_profile.findUnique({ where: { id } });

    if (!existing || existing.user_id !== userId || existing.deleted_at) {
      return false;
    }

    await db.candidate_profile.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return true;
  }

  async list(userId: string, options: ListOptions = {}): Promise<ListResult<CandidateProfile>> {
    const db = getDatabase();
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db.candidate_profile.findMany({
        where: {
          user_id: userId,
          deleted_at: null,
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      db.candidate_profile.count({
        where: {
          user_id: userId,
          deleted_at: null,
        },
      }),
    ]);

    return { items, total, page, limit };
  }
}
