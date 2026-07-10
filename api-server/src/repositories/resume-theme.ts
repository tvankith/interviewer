import { getDatabase } from '../db/connection';
import type { ResumeTheme, ListOptions, ListResult } from '../types';

export class ResumeThemeRepository {
  async getDefault(): Promise<ResumeTheme | null> {
    const db = getDatabase();
    return db.resume_theme.findFirst({
      where: { deleted_at: null },
      orderBy: { created_at: 'asc' },
    });
  }

  async getById(id: string): Promise<ResumeTheme | null> {
    const db = getDatabase();
    return db.resume_theme.findFirst({
      where: { id, deleted_at: null },
    });
  }

  async list(options: ListOptions = {}): Promise<ListResult<ResumeTheme>> {
    const db = getDatabase();
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db.resume_theme.findMany({
        where: { deleted_at: null },
        skip,
        take: limit,
        orderBy: { created_at: 'asc' },
      }),
      db.resume_theme.count({ where: { deleted_at: null } }),
    ]);

    return { items, total, page, limit };
  }
}
