import { ProfileSpecRepository } from '../repositories/profile-spec';
import type { ProfileSpec, CreateProfileSpecInput, UpdateProfileSpecInput } from '../types';

export class ProfileSpecService {
  private repository: ProfileSpecRepository;

  constructor() {
    this.repository = new ProfileSpecRepository();
  }

  async getSpec(
    userId: string,
    profileId: string,
    specId: string,
  ): Promise<ProfileSpec | null> {
    return this.repository.findByProfileIdAndId(profileId, specId, userId);
  }

  async listSpecs(userId: string, profileId: string): Promise<ProfileSpec[]> {
    return this.repository.findByProfileId(profileId, userId);
  }

  async createSpec(
    userId: string,
    profileId: string,
    input: CreateProfileSpecInput,
  ): Promise<ProfileSpec> {
    return this.repository.create(profileId, userId, input);
  }

  async updateSpec(
    userId: string,
    profileId: string,
    specId: string,
    input: UpdateProfileSpecInput,
  ): Promise<ProfileSpec | null> {
    return this.repository.update(profileId, specId, userId, input);
  }

  async deleteSpec(userId: string, profileId: string, specId: string): Promise<boolean> {
    return this.repository.delete(profileId, specId, userId);
  }
}
