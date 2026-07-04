import getDefaultResumeTemplate from "@/helpers/getDefaultResumeTemplate";
import ResumeForm from "./resume-form";

export const dynamic = 'force-dynamic';

export default async function Page() {

  const [template] = await Promise.all([
    Promise.resolve(getDefaultResumeTemplate()),
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
        summary: '',
        template_id: '',
        website: ''
      }}
      template={template}
    />
  );
}