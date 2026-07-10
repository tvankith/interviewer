import { ResumeThemeRepository } from '../repositories/resume-theme';
import type { ResumeTheme, ListOptions, ListResult } from '../types';

export class ResumeThemeService {
  private repository: ResumeThemeRepository;

  constructor() {
    this.repository = new ResumeThemeRepository();
  }

  async getDefault(): Promise<ResumeTheme | null> {
    return this.repository.getDefault();
  }

  async getById(id: string): Promise<ResumeTheme | null> {
    return this.repository.getById(id);
  }

  async list(options: ListOptions = {}): Promise<ListResult<ResumeTheme>> {
    return this.repository.list(options);
  }
}
