
type Project = {
    name?: string;
    description?: string;
    tech_stack: string[];
};

type Experience = {
    company?: string;
    role?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
    tech_stack: string[];
};

export type Education = {
    institute?: string;
    course?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
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
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    skills?: string[];
    website?: string;
    template_id?: string;
    target_role?: string;
};

export type CandidatePayload = {
    projects?: {
        name?: string;
        description?: string;
        tech_stack: string[];
    }[];
    experiences?: {
        company?: string;
        role?: string;
        start_date?: string;
        end_date?: string;
        description?: string;
        tech_stack: string[];
    }[];
    educations?: Education[];
    links?: SocialLink[];
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    skills?: string[];
    website?: string;
    target_role?: string;
};

export type ResumeDropzoneProps = {
    onFileSelect: (file: File) => void;
    isLoading?: boolean;
};
