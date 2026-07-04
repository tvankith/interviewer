import { CandidateFormValues } from "../profile/compose/types";

export const mapFormToProfilePayload = (data: CandidateFormValues) => ({
    projects: data.projects?.map((p: any) => ({
        ...p,
        tech_stack:
            typeof p.tech_stack === "string"
                ? p.tech_stack.split(",").map((s: string) => s.trim())
                : p.tech_stack,
    })),
    experiences: data.experiences?.map((e: any) => ({
        ...e,
        tech_stack:
            typeof e.tech_stack === "string"
                ? e.tech_stack.split(",").map((s: string) => s.trim())
                : e.tech_stack,
    })),
    educations: data?.educations || [],
    links: data?.links || [],
    name: data?.name || "",
    email: data?.email || "",
    phone: data?.phone,
    location: data?.location || "",
    summary: data?.summary || "",
    website: data?.website || "",
    skills: data?.skills || [],
});
