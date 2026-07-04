"use client";

import { createContext, useContext } from "react";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import type { CandidateFormValues, CandidatePayload } from "../profile/compose/types";

export type ProfileEditorContextValue = {
    register: UseFormRegister<CandidateFormValues>;
    setValue: UseFormSetValue<CandidateFormValues>;
    projects: CandidateFormValues["projects"];
    experiences: CandidateFormValues["experiences"];
    educations: CandidateFormValues["educations"];
    links: CandidateFormValues["links"];
    summary: string | undefined;
    skills?: string[];
    isParsing: boolean;
    isLoading: boolean;
};

export const ProfileEditorContext = createContext<ProfileEditorContextValue | null>(null);

export function useProfileEditor() {
    const ctx = useContext(ProfileEditorContext);
    if (!ctx) throw new Error("useProfileEditor must be used within ProfileEditor");
    return ctx;
}
