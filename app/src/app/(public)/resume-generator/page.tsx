import getResumeTemplate from "@/helpers/getResumeTemplate";
import getResumeTheme from "@/helpers/getResumeTheme";
import classicTemplate from "@/resume-engine/templates/classic.template.json";
import classicTheme from "@/resume-engine/templates/classic.theme.json";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";
import ResumeForm from "./resume-form";

export const dynamic = 'force-dynamic';

export default async function Page() {

  const [templateDoc, themeDoc] = await Promise.all([
    getResumeTemplate(),
    getResumeTheme(),
  ]);

  return (
    <ResumeForm
      initialData={{
        about: '',
        educations: [],
        experiences: [],
        links: [],
        projects: [],
        skills: [],
        email: '',
        location: '',
        name: '',
        phone: '',
        summary: undefined,
        template_id: '',
        website: ''
      }}
      templateDoc={templateDoc ?? (classicTemplate as unknown as TemplateDocument)}
      themeDoc={themeDoc ?? (classicTheme as unknown as ThemeDocument)}
    />
  );
}