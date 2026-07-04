import { getDatabase } from '../db/connection';
import type { ProfileSpec, CreateProfileSpecInput, UpdateProfileSpecInput } from '../types';

export class ProfileSpecRepository {
  async findByProfileIdAndId(
    profileId: string,
    specId: string,
    userId: string,
  ): Promise<ProfileSpec | null> {
    const db = getDatabase();

    // Verify profile ownership first
    const profile = await db.candidate_profile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.user_id !== userId || profile.deleted_at) {
      return null;
    }

    const spec = await db.profile_spec.findUnique({
      where: { id: specId },
    });

    if (!spec) return null;
    if (spec.candidate_profile_id !== profileId) return null;
    if (spec.deleted_at) return null;

    return spec;
  }

  async findByProfileId(profileId: string, userId: string): Promise<ProfileSpec[]> {
    const db = getDatabase();

    // Verify profile ownership first
    const profile = await db.candidate_profile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.user_id !== userId || profile.deleted_at) {
      return [];
    }

    return db.profile_spec.findMany({
      where: {
        candidate_profile_id: profileId,
        deleted_at: null,
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async create(
    profileId: string,
    userId: string,
    input: CreateProfileSpecInput,
  ): Promise<ProfileSpec> {
    const db = getDatabase();

    // Verify profile ownership first
    const profile = await db.candidate_profile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.user_id !== userId || profile.deleted_at) {
      throw new Error('Profile not found or access denied');
    }

    // Check uniqueness of name
    const existing = await db.profile_spec.findFirst({
      where: {
        candidate_profile_id: profileId,
        name: input.name,
        deleted_at: null,
      },
    });

    if (existing) {
      throw new Error(`Spec with name '${input.name}' already exists for this profile`);
    }

    return db.profile_spec.create({
      data: {
        candidate_profile_id: profileId,
        ...input,
      },
    });
  }

  async update(
    profileId: string,
    specId: string,
    userId: string,
    input: UpdateProfileSpecInput,
  ): Promise<ProfileSpec | null> {
    const db = getDatabase();

    // Verify profile ownership first
    const profile = await db.candidate_profile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.user_id !== userId || profile.deleted_at) {
      return null;
    }

    const spec = await db.profile_spec.findUnique({
      where: { id: specId },
    });

    if (!spec || spec.candidate_profile_id !== profileId || spec.deleted_at) {
      return null;
    }

    // If updating name, check uniqueness
    if (input.name && input.name !== spec.name) {
      const existing = await db.profile_spec.findFirst({
        where: {
          candidate_profile_id: profileId,
          name: input.name,
          deleted_at: null,
        },
      });

      if (existing) {
        throw new Error(`Spec with name '${input.name}' already exists for this profile`);
      }
    }

    return db.profile_spec.update({
      where: { id: specId },
      data: {
        ...input,
        updated_at: new Date(),
      },
    });
  }

  async delete(profileId: string, specId: string, userId: string): Promise<boolean> {
    const db = getDatabase();

    // Verify profile ownership first
    const profile = await db.candidate_profile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.user_id !== userId || profile.deleted_at) {
      return false;
    }

    const spec = await db.profile_spec.findUnique({
      where: { id: specId },
    });

    if (!spec || spec.candidate_profile_id !== profileId || spec.deleted_at) {
      return false;
    }

    await db.profile_spec.update({
      where: { id: specId },
      data: { deleted_at: new Date() },
    });

    return true;
  }
}
