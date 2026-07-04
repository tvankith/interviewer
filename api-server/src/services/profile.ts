import { ProfileRepository } from '../repositories/profile';
import type { CandidateProfile, CreateProfileInput, UpdateProfileInput, ListOptions, ListResult } from '../types';

export class ProfileService {
  private repository: ProfileRepository;

  constructor() {
    this.repository = new ProfileRepository();
  }

  async create(userId: string, input: CreateProfileInput): Promise<CandidateProfile> {
    return this.repository.create(userId, input);
  }

  async getById(id: string, userId: string): Promise<CandidateProfile | null> {
    return this.repository.getById(id, userId);
  }

  async update(id: string, userId: string, input: UpdateProfileInput): Promise<CandidateProfile | null> {
    return this.repository.update(id, userId, input);
  }

  async patch(id: string, userId: string, input: Partial<UpdateProfileInput>): Promise<CandidateProfile | null> {
    return this.repository.update(id, userId, input);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return this.repository.delete(id, userId);
  }

  async list(userId: string, options: ListOptions = {}): Promise<ListResult<CandidateProfile>> {
    return this.repository.list(userId, options);
  }
}
