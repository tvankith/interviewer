import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const CLASSIC_TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11px;
    color: #1a1a1a;
    background: #fff;
    padding: 36px 48px;
    line-height: 1.5;
  }
  a { color: inherit; text-decoration: none; }

  /* Header */
  .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; }
  .header h1 { font-size: 22px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; }
  .contact { margin-top: 6px; font-size: 10px; color: #444; display: flex; justify-content: center; flex-wrap: wrap; gap: 4px 12px; }
  .contact span::before { content: ""; }
  .contact span + span::before { content: "·  "; color: #999; }

  /* Sections */
  .section { margin-top: 14px; }
  .section-title {
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border-bottom: 1px solid #1a1a1a;
    padding-bottom: 2px;
    margin-bottom: 8px;
  }

  /* Summary */
  .summary-text { font-size: 11px; color: #333; }
  .summary-text p { margin-bottom: 4px; }

  /* Experience */
  .entry { margin-bottom: 10px; }
  .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
  .entry-title { font-weight: bold; font-size: 11px; }
  .entry-date { font-size: 10px; color: #555; white-space: nowrap; flex-shrink: 0; margin-left: 8px; }
  .entry-subtitle { font-style: italic; font-size: 10.5px; color: #444; margin-top: 1px; }
  .entry-body { margin-top: 4px; font-size: 10.5px; color: #333; }
  .entry-body p { margin-bottom: 3px; }
  .entry-body ul { padding-left: 14px; }
  .entry-body ul li { margin-bottom: 2px; }
  .tech-tags { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 3px; }
  .tech-tag {
    font-size: 9px;
    font-family: 'Courier New', monospace;
    background: #f3f3f3;
    border: 1px solid #ddd;
    border-radius: 2px;
    padding: 1px 5px;
    color: #444;
  }

  /* Education */
  .edu-header { display: flex; justify-content: space-between; align-items: baseline; }
  .edu-title { font-weight: bold; font-size: 11px; }
  .edu-date { font-size: 10px; color: #555; white-space: nowrap; flex-shrink: 0; margin-left: 8px; }
  .edu-course { font-style: italic; font-size: 10.5px; color: #444; margin-top: 1px; }
  .edu-desc { margin-top: 3px; font-size: 10.5px; color: #333; }

  /* Skills */
  .skills-list { display: flex; flex-wrap: wrap; gap: 4px; }
  .skill-chip {
    font-size: 10px;
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 3px;
    padding: 2px 7px;
  }
  .skills-text { font-size: 10.5px; color: #333; }
  .skills-text p { margin-bottom: 3px; }

  /* Projects */
  .project-entry { margin-bottom: 8px; }
  .project-name { font-weight: bold; font-size: 11px; }
  .project-desc { margin-top: 3px; font-size: 10.5px; color: #333; }
  .project-desc p { margin-bottom: 3px; }

  /* Links */
  .links-row { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 10.5px; }
  .link-item { color: #333; }
  .link-item .link-label { font-weight: bold; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  {{#if name}}<h1>{{name}}</h1>{{/if}}
  <div class="contact">
    {{#if email}}<span>{{email}}</span>{{/if}}
    {{#if phone}}<span>{{phone}}</span>{{/if}}
    {{#if location}}<span>{{location}}</span>{{/if}}
    {{#if website}}<span><a href="{{website}}">{{website}}</a></span>{{/if}}
    {{#each links}}<span><a href="{{url}}">{{label}}</a></span>{{/each}}
  </div>
</div>

<!-- SUMMARY -->
{{#if summary}}
<div class="section">
  <div class="section-title">Summary</div>
  <div class="summary-text">{{{summary}}}</div>
</div>
{{/if}}

<!-- EXPERIENCE -->
{{#if experience}}
<div class="section">
  <div class="section-title">Experience</div>
  {{#each experience}}
  <div class="entry">
    <div class="entry-header">
      <span class="entry-title">{{role}}{{#if company}} — {{company}}{{/if}}</span>
      <span class="entry-date">{{start}}{{#if end}} – {{end}}{{/if}}</span>
    </div>
    {{#if description}}
    <div class="entry-body">{{{description}}}</div>
    {{/if}}
    {{#if tech_stack}}
    <div class="tech-tags">
      {{#each tech_stack}}<span class="tech-tag">{{this}}</span>{{/each}}
    </div>
    {{/if}}
  </div>
  {{/each}}
</div>
{{/if}}

<!-- EDUCATION -->
{{#if education}}
<div class="section">
  <div class="section-title">Education</div>
  {{#each education}}
  <div class="entry">
    <div class="edu-header">
      <span class="edu-title">{{institute}}</span>
      <span class="edu-date">{{start}}{{#if end}} – {{end}}{{/if}}</span>
    </div>
    {{#if course}}<div class="edu-course">{{course}}</div>{{/if}}
    {{#if description}}<div class="edu-desc">{{{description}}}</div>{{/if}}
  </div>
  {{/each}}
</div>
{{/if}}

<!-- SKILLS -->
{{#if skills}}
<div class="section">
  <div class="section-title">Skills</div>
  <div class="skills-list">
    {{#each skills}}<span class="skill-chip">{{this}}</span>{{/each}}
  </div>
</div>
{{else if skills_text}}
<div class="section">
  <div class="section-title">Skills</div>
  <div class="skills-text">{{{skills_text}}}</div>
</div>
{{/if}}

<!-- PROJECTS -->
{{#if projects}}
<div class="section">
  <div class="section-title">Projects</div>
  {{#each projects}}
  <div class="project-entry">
    <span class="project-name">{{name}}</span>
    {{#if description}}<div class="project-desc">{{{description}}}</div>{{/if}}
    {{#if technologies}}
    <div class="tech-tags">
      {{#each technologies}}<span class="tech-tag">{{this}}</span>{{/each}}
    </div>
    {{/if}}
  </div>
  {{/each}}
</div>
{{/if}}

</body>
</html>`;

async function main() {
  await prisma.resume_template.upsert({
    where: { id: 'tpl-classic-v1' },
    update: {
      name: 'Classic',
      version: '1.0.0',
      content: { html: CLASSIC_TEMPLATE_HTML },
      is_public: true,
    },
    create: {
      id: 'tpl-classic-v1',
      name: 'Classic',
      version: '1.0.0',
      content: { html: CLASSIC_TEMPLATE_HTML },
      is_public: true,
    },
  });

  console.log('Seeded: resume_template "Classic"');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
