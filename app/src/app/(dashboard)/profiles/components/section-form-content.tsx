import { ChipInput, EducationBuilder, ExperienceBuilder, Field, FieldContent, FieldLabel, Input, ProjectBuilder, ResumeDropzone, RichTextEditor, SocialLinksBuilder } from "@/design-system";
import { useProfileEditor } from "./profile-editor-context";
import TemplateSelector from "./template-selector";
import type { SectionId } from "./profile-sections";

export default function SectionFormContent({ sectionId }: { sectionId: SectionId }) {
    const {
        register,
        setValue,
        projects,
        experiences,
        educations,
        links,
        summary,
        skills,
    } = useProfileEditor();

    switch (sectionId) {
        case "basic":
            return (
                <div className="space-y-4">
                    <Field>
                        <FieldLabel>Full Name</FieldLabel>
                        <FieldContent>
                            <Input {...register("name")} placeholder="Your full name" />
                        </FieldContent>
                    </Field>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                        <Field>
                            <FieldLabel>Email</FieldLabel>
                            <FieldContent>
                                <Input {...register("email")} />
                            </FieldContent>
                        </Field>
                        <Field>
                            <FieldLabel>Mobile</FieldLabel>
                            <FieldContent>
                                <Input {...register("phone")} placeholder="+1 234 567 8900" />
                            </FieldContent>
                        </Field>
                        <Field>
                            <FieldLabel>Location</FieldLabel>
                            <FieldContent>
                                <Input {...register("location")} placeholder="City, Country" />
                            </FieldContent>
                        </Field>
                        <Field>
                            <FieldLabel>Website</FieldLabel>
                            <FieldContent>
                                <Input {...register("website")} placeholder="https://..." />
                            </FieldContent>
                        </Field>
                    </div>
                </div>
            );

        case "summary":
            return (
                <Field>
                    <FieldLabel>Professional Summary</FieldLabel>
                    <FieldContent>
                        <RichTextEditor
                            value={summary}
                            onChange={(html) => setValue("summary", html)}
                        />
                    </FieldContent>
                </Field>
            );

        case "skills":
            return (
                <Field>
                    <FieldLabel>Skills</FieldLabel>
                    <FieldContent>
                        <ChipInput
                            value={skills ?? []}
                            onChange={(val) => setValue("skills", val)}
                            placeholder="Add a skill..."
                        />
                    </FieldContent>
                </Field>
            );

        case "links":
            return (
                <Field>
                    <FieldLabel>Social Links</FieldLabel>
                    <FieldContent>
                        <SocialLinksBuilder
                            value={links ?? []}
                            onChange={(val) => setValue("links", val)}
                        />
                    </FieldContent>
                </Field>
            );

        case "education":
            return (
                <Field>
                    <FieldLabel>Education</FieldLabel>
                    <FieldContent>
                        <EducationBuilder
                            value={educations ?? []}
                            onChange={(val) => setValue("educations", val)}
                        />
                    </FieldContent>
                </Field>
            );

        case "projects":
            return (
                <Field>
                    <FieldLabel>Projects</FieldLabel>
                    <FieldContent>
                        <ProjectBuilder
                            value={projects ?? []}
                            onChange={(val) => setValue("projects", val)}
                        />
                    </FieldContent>
                </Field>
            );

        case "experience":
            return (
                <Field>
                    <FieldLabel>Experience</FieldLabel>
                    <FieldContent>
                        <ExperienceBuilder
                            value={experiences ?? []}
                            onChange={(val) => setValue("experiences", val)}
                        />
                    </FieldContent>
                </Field>
            );
    }
}