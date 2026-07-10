import type { RichTextValue } from "@/resume-engine/types/lexical";
import type { SkillGroup } from "@/design-system";

type Project = {
    name?: string;
    description?: RichTextValue;
    tech_stack: string[];
};

type Experience = {
    company?: string;
    role?: string;
    start_date?: string;
    end_date?: string;
    description?: RichTextValue;
    tech_stack: string[];
};

export type Education = {
    institute?: string;
    course?: string;
    start_date?: string;
    end_date?: string;
    description?: RichTextValue;
};

export type SocialLink = {
    url: string;
    social_media: string;
};

export type CandidateFormValues = {
    projects?: Project[];
    experiences?: Experience[];
    educations?: Education[];
    links?: SocialLink[];
    about?: string;
    resume_file?: File | null;
    title?: string;
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: RichTextValue;
    skills?: SkillGroup[];
    website?: string;
    template_id?: string;
    theme_id?: string;
    target_role?: string;
};

export type CandidatePayload = {
    projects?: {
        name?: string;
        description?: RichTextValue;
        tech_stack: string[];
    }[];
    experiences?: {
        company?: string;
        role?: string;
        start_date?: string;
        end_date?: string;
        description?: RichTextValue;
        tech_stack: string[];
    }[];
    educations?: Education[];
    links?: SocialLink[];
    title?: string;
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: RichTextValue;
    skills?: SkillGroup[];
    website?: string;
    target_role?: string;
};

export type ResumeDropzoneProps = {
    onFileSelect: (file: File) => void;
    isLoading?: boolean;
};
