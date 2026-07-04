import { ResumeTemplateRepository } from '../repositories/resume-template';
import type { ResumeTemplate, CreateResumeTemplateInput, UpdateResumeTemplateInput, ListOptions, ListResult } from '../types';

export class ResumeTemplateService {
  private repository: ResumeTemplateRepository;

  constructor() {
    this.repository = new ResumeTemplateRepository();
  }

  async getDefault(): Promise<ResumeTemplate | null> {
    return this.repository.getDefault();
  }

  async getById(id: string): Promise<ResumeTemplate | null> {
    return this.repository.getById(id);
  }

  async create(input: CreateResumeTemplateInput, userId?: string): Promise<ResumeTemplate> {
    return this.repository.create(input, userId);
  }

  async update(id: string, input: Partial<UpdateResumeTemplateInput>): Promise<ResumeTemplate | null> {
    return this.repository.update(id, input);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  async list(options: ListOptions = {}): Promise<ListResult<ResumeTemplate>> {
    return this.repository.list(options);
  }
}
