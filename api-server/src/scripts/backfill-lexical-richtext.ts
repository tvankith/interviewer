/**
 * One-off backfill: converts every candidate_profile rich-text field
 * (summary, and each experiences/projects/educations[].description) from
 * its pre-migration plain string into a Lexical SerializedEditorState,
 * matching the shape app/src/resume-engine/types/lexical.ts now expects
 * everywhere. Idempotent — already-migrated (object-shaped) values are left
 * untouched, so this is safe to re-run.
 *
 * `summary` values written by the old RichTextEditor are HTML strings (its
 * only output format before this migration); other description fields are
 * plain text (LLM-parsed). Both are normalized here: HTML is reduced to
 * plain text on paragraph/list-item/br boundaries (this loses inline
 * bold/italic formatting — acceptable for a one-time legacy-data backfill,
 * not attempting a full HTML->Lexical AST conversion) before being wrapped
 * as one Lexical paragraph per line.
 *
 * Run with: npx tsx src/scripts/backfill-lexical-richtext.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isLexicalDoc(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { root?: { type?: unknown } }).root?.type === 'root'
  );
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

function plainTextToLexicalJson(text: string) {
  const plain = /<[a-z][\s\S]*>/i.test(text) ? htmlToPlainText(text) : text;
  const lines = plain.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const paragraphs = (lines.length > 0 ? lines : [plain]).map((line) => ({
    children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: line, type: 'text', version: 1 }],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1,
  }));

  return {
    root: { children: paragraphs, direction: 'ltr', format: '', indent: 0, type: 'root', version: 1 },
  };
}

function migrateField(value: unknown): unknown {
  if (typeof value !== 'string' || !value.trim()) return value;
  return plainTextToLexicalJson(value);
}

function migrateItems(items: unknown): { changed: boolean; items: unknown } {
  if (!Array.isArray(items)) return { changed: false, items };
  let changed = false;
  const migrated = items.map((item) => {
    if (item && typeof item === 'object' && 'description' in item) {
      const desc = (item as { description: unknown }).description;
      if (typeof desc === 'string' && desc.trim() && !isLexicalDoc(desc)) {
        changed = true;
        return { ...item, description: migrateField(desc) };
      }
    }
    return item;
  });
  return { changed, items: migrated };
}

async function main() {
  const profiles = await prisma.candidate_profile.findMany({ where: { deleted_at: null } });
  let updatedCount = 0;

  for (const profile of profiles) {
    const data: Record<string, unknown> = {};

    if (typeof profile.summary === 'string' && !isLexicalDoc(profile.summary)) {
      data.summary = migrateField(profile.summary);
    }

    const experiences = migrateItems(profile.experiences);
    if (experiences.changed) data.experiences = experiences.items;

    const projects = migrateItems(profile.projects);
    if (projects.changed) data.projects = projects.items;

    const educations = migrateItems(profile.educations);
    if (educations.changed) data.educations = educations.items;

    if (Object.keys(data).length > 0) {
      await prisma.candidate_profile.update({ where: { id: profile.id }, data });
      updatedCount += 1;
      console.log(`Migrated candidate_profile ${profile.id}: ${Object.keys(data).join(', ')}`);
    }
  }

  console.log(`Done. Updated ${updatedCount} of ${profiles.length} profile(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
