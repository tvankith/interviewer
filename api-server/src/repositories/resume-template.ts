import { getDatabase } from '../db/connection';
import type { ResumeTemplate, CreateResumeTemplateInput, UpdateResumeTemplateInput, ListOptions, ListResult } from '../types';

export class ResumeTemplateRepository {
  async getDefault(): Promise<ResumeTemplate | null> {
    const db = getDatabase();
    return db.resume_template.findFirst({
      where: { deleted_at: null },
      orderBy: { created_at: 'asc' },
    });
  }

  async getById(id: string): Promise<ResumeTemplate | null> {
    const db = getDatabase();
    return db.resume_template.findFirst({
      where: { id, deleted_at: null },
    });
  }

  async create(input: CreateResumeTemplateInput): Promise<ResumeTemplate> {
    const db = getDatabase();
    return db.resume_template.create({
      data: {
        name: input.name,
        version: input.version ?? '1.0.0',
        content: input.content as any,
        is_public: input.is_public ?? false,
        thumbnail_url: input.thumbnail_url ?? null,
      },
    });
  }

  async update(id: string, input: Partial<UpdateResumeTemplateInput>): Promise<ResumeTemplate | null> {
    const db = getDatabase();
    const existing = await db.resume_template.findFirst({ where: { id, deleted_at: null } });
    if (!existing) return null;

    return db.resume_template.update({
      where: { id },
      data: input as any,
    });
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const existing = await db.resume_template.findFirst({ where: { id, deleted_at: null } });
    if (!existing) return false;

    await db.resume_template.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return true;
  }

  async list(options: ListOptions = {}): Promise<ListResult<ResumeTemplate>> {
    const db = getDatabase();
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db.resume_template.findMany({
        where: { deleted_at: null },
        skip,
        take: limit,
        orderBy: { created_at: 'asc' },
      }),
      db.resume_template.count({ where: { deleted_at: null } }),
    ]);

    return { items, total, page, limit };
  }
}
