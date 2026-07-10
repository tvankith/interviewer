import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import CLASSIC_TEMPLATE from './data/classic.template.json';
import CLASSIC_THEME from './data/classic.theme.json';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  await prisma.resume_template.upsert({
    where: { id: 'tpl-classic-v1' },
    update: {
      name: 'Classic',
      version: '1.0.0',
      content: CLASSIC_TEMPLATE,
      is_public: true,
    },
    create: {
      id: 'tpl-classic-v1',
      name: 'Classic',
      version: '1.0.0',
      content: CLASSIC_TEMPLATE,
      is_public: true,
    },
  });
  console.log('Seeded: resume_template "Classic"');

  await prisma.resume_theme.upsert({
    where: { id: 'classic-theme-v1' },
    update: {
      name: 'Classic',
      version: '1.0.0',
      content: CLASSIC_THEME,
      is_public: true,
    },
    create: {
      id: 'classic-theme-v1',
      name: 'Classic',
      version: '1.0.0',
      content: CLASSIC_THEME,
      is_public: true,
    },
  });
  console.log('Seeded: resume_theme "Classic"');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
