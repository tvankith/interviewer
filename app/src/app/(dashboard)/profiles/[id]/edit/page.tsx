import { getProfileById } from "@/apis/profile";
import { notFound } from "next/navigation";
import EditProfile from "./edit-profile";
import getDefaultResumeTemplate from "@/helpers/getDefaultResumeTemplate";

type Props = {
  params: { id: string };
};

export const dynamic = "force-dynamic";

export default async function Page({ params }: Props) {
  const { id } = await params;

  const [data, template] = await Promise.all([
    getProfileById(id),
    Promise.resolve(getDefaultResumeTemplate()),
  ]);

  if (!data) return notFound();

  return <EditProfile id={id} initialData={data} template={template} />;
}
