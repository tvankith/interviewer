import { getProfileById } from "@/apis/profile";
import { notFound } from "next/navigation";
import EditProfile from "./edit-profile";
import getResumeTemplate from "@/helpers/getResumeTemplate";
import getResumeTheme from "@/helpers/getResumeTheme";
import classicTemplate from "@/resume-engine/templates/classic.template.json";
import classicTheme from "@/resume-engine/templates/classic.theme.json";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";

type Props = {
  params: { id: string };
};

export const dynamic = "force-dynamic";

export default async function Page({ params }: Props) {
  const { id } = await params;

  const data = await getProfileById(id);
  if (!data) return notFound();

  const [templateDoc, themeDoc] = await Promise.all([
    getResumeTemplate(data.template_id),
    getResumeTheme(data.theme_id),
  ]);

  return (
    <EditProfile
      id={id}
      initialData={data}
      templateDoc={templateDoc ?? (classicTemplate as unknown as TemplateDocument)}
      themeDoc={themeDoc ?? (classicTheme as unknown as ThemeDocument)}
    />
  );
}
