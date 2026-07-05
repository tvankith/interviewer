import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Structured JSON template/theme, replacing the old Handlebars {html: string}
// content shape. This is the same document authored in
// app/src/resume-engine/templates/classic.template.json — duplicated here
// because app/ and api-server/ are built as separate Docker images with no
// shared package between them (see plan Open Risk #7).
const CLASSIC_TEMPLATE = {
  schemaVersion: 1,
  id: 'tpl-classic-v1',
  name: 'Classic',
  root: {
    id: 'page',
    type: 'Page',
    children: [
      {
        id: 'header',
        type: 'Column',
        className: 'items-center text-center',
        props: { gap: 'xs' },
        children: [
          {
            id: 'name',
            type: 'Text',
            binding: 'name',
            editable: { editable: true },
            className: 'uppercase tracking-widest',
            props: { as: 'h1', variant: 'h1' },
          },
          {
            id: 'contact-row',
            type: 'Row',
            className: 'flex-wrap',
            props: { gap: 'sm', justify: 'center' },
            children: [
              { id: 'email', type: 'Text', binding: 'email', editable: { editable: true }, props: { variant: 'small' } },
              { id: 'phone', type: 'Text', binding: 'phone', editable: { editable: true }, props: { variant: 'small' } },
              { id: 'location', type: 'Text', binding: 'location', editable: { editable: true }, props: { variant: 'small' } },
              { id: 'website', type: 'Text', binding: 'website', editable: { editable: true }, props: { variant: 'small', href: true } },
              {
                id: 'links',
                type: 'List',
                binding: 'links',
                props: {
                  itemTemplate: {
                    id: 'link-item',
                    type: 'Text',
                    binding: 'social_media',
                    props: { variant: 'small', href: true, hrefBinding: 'url' },
                  },
                },
              },
            ],
          },
        ],
      },
      { id: 'header-divider', type: 'Divider' },
      {
        id: 'summary-section',
        type: 'Section',
        props: { title: 'Summary' },
        children: [{ id: 'summary-text', type: 'RichText', binding: 'summary', editable: { editable: true } }],
      },
      {
        id: 'experience-section',
        type: 'Section',
        props: { title: 'Experience' },
        children: [
          {
            id: 'experience-list',
            type: 'List',
            binding: 'experiences',
            props: {
              gap: 'sm',
              itemTemplate: {
                id: 'experience-item',
                type: 'Stack',
                props: { gap: 'xs' },
                children: [
                  {
                    id: 'exp-header',
                    type: 'Row',
                    props: { justify: 'space-between', align: 'baseline' },
                    children: [
                      {
                        id: 'exp-title',
                        type: 'Text',
                        binding: 'role',
                        editable: { editable: true },
                        props: { variant: 'label', bindingEnd: 'company', separator: ' — ' },
                      },
                      {
                        id: 'exp-date',
                        type: 'Text',
                        binding: 'start_date',
                        editable: { editable: true },
                        props: { variant: 'small', muted: true, bindingEnd: 'end_date', separator: ' – ' },
                      },
                    ],
                  },
                  { id: 'exp-description', type: 'RichText', binding: 'description', editable: { editable: true } },
                  { id: 'exp-tech', type: 'List', binding: 'tech_stack', editable: { editable: true }, props: { display: 'chip' } },
                ],
              },
            },
          },
        ],
      },
      {
        id: 'education-section',
        type: 'Section',
        props: { title: 'Education' },
        children: [
          {
            id: 'education-list',
            type: 'List',
            binding: 'educations',
            props: {
              gap: 'sm',
              itemTemplate: {
                id: 'education-item',
                type: 'Stack',
                props: { gap: 'xs' },
                children: [
                  {
                    id: 'edu-header',
                    type: 'Row',
                    props: { justify: 'space-between', align: 'baseline' },
                    children: [
                      { id: 'edu-title', type: 'Text', binding: 'institute', editable: { editable: true }, props: { variant: 'label' } },
                      {
                        id: 'edu-date',
                        type: 'Text',
                        binding: 'start_date',
                        editable: { editable: true },
                        props: { variant: 'small', muted: true, bindingEnd: 'end_date', separator: ' – ' },
                      },
                    ],
                  },
                  {
                    id: 'edu-course',
                    type: 'Text',
                    binding: 'course',
                    editable: { editable: true },
                    className: 'italic',
                    props: { variant: 'small', muted: true },
                  },
                  { id: 'edu-description', type: 'RichText', binding: 'description', editable: { editable: true } },
                ],
              },
            },
          },
        ],
      },
      {
        id: 'skills-section',
        type: 'Section',
        props: { title: 'Skills' },
        children: [{ id: 'skills-list', type: 'List', binding: 'skills', editable: { editable: true }, props: { display: 'chip' } }],
      },
      {
        id: 'projects-section',
        type: 'Section',
        props: { title: 'Projects' },
        children: [
          {
            id: 'projects-list',
            type: 'List',
            binding: 'projects',
            props: {
              gap: 'sm',
              itemTemplate: {
                id: 'project-item',
                type: 'Stack',
                props: { gap: 'xs' },
                children: [
                  { id: 'project-name', type: 'Text', binding: 'name', editable: { editable: true }, props: { variant: 'label' } },
                  { id: 'project-description', type: 'RichText', binding: 'description', editable: { editable: true } },
                  { id: 'project-tech', type: 'List', binding: 'tech_stack', editable: { editable: true }, props: { display: 'chip' } },
                ],
              },
            },
          },
        ],
      },
    ],
  },
};

const CLASSIC_THEME = {
  schemaVersion: 1,
  id: 'classic-theme-v1',
  name: 'Classic',
  fonts: {
    base: "Georgia, 'Times New Roman', serif",
    heading: "Georgia, 'Times New Roman', serif",
  },
  colors: {
    text: '#1a1a1a',
    muted: '#555555',
    light: '#999999',
    line: '#1a1a1a',
    pillBg: '#f5f5f5',
    pillBorder: '#e0e0e0',
  },
  sizes: {
    h1: '22px',
    h2: '13px',
    body: '11px',
    small: '10px',
    label: '11px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '14px',
    lg: '20px',
    xl: '32px',
  },
  borders: {
    radius: '3px',
    width: '1px',
  },
  page: {
    background: '#ffffff',
    maxWidth: '800px',
    padding: '36px 48px',
  },
};

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
