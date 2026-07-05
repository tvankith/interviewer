"use client";

import { useRef, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { debounce } from "lodash";
import { updateProfile } from "@/apis/profile";
import ProfileEditor from "../../components/profile-editor";
import { useRouter } from "next/navigation";
import type { CandidateFormValues } from "../../profile/compose/types";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";

type Props = {
    id: string;
    initialData: CandidateFormValues;
    templateDoc: TemplateDocument;
    themeDoc: ThemeDocument;
};

export default function EditProfile({
    id,
    initialData,
    templateDoc,
    themeDoc,
}: Props) {
    const router = useRouter()
    const methods = useForm<CandidateFormValues>({ defaultValues: initialData });

    const lastSavedDataRef = useRef<CandidateFormValues>(initialData);
    const abortControllerRef = useRef<AbortController | null>(null);
    const debouncedHandleSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

    /* ---------------- UPDATE PROFILE ---------------- */
    const updateMutation = useMutation({
        mutationFn: (payload: any) => updateProfile(id, payload, { signal: abortControllerRef.current?.signal }),

        onSuccess: (_, variables) => {
            // Merge in only the fields that were actually sent — variables is the
            // partial diff payload, not the full form, so replacing the ref outright
            // would make every untouched field look "changed" on the next autosave tick.
            lastSavedDataRef.current = { ...lastSavedDataRef.current, ...variables };
        },
    });

    /* ---------------- DEBOUNCED AUTO-SAVE ON CHANGE ---------------- */
    useEffect(() => {
        const handleSave = (data: CandidateFormValues) => {
            console.log("log: payload 2", lastSavedDataRef)
            if (JSON.stringify(lastSavedDataRef.current) !== JSON.stringify(data)) {
                const lastSaved = lastSavedDataRef.current || {};
                const payload: any = {};

                // Only include fields that actually changed
                const fieldsToCheck = ['name', 'email', 'phone', 'location', 'summary', 'website', 'skills', 'projects', 'experiences', 'educations', 'links', 'template_id', 'theme_id'];

                fieldsToCheck.forEach((field) => {
                    const newValue = field === 'projects'
                        ? (data.projects || []).map((p: any) => ({ ...p, tech_stack: p.tech_stack || [] }))
                        : field === 'experiences'
                        ? (data.experiences || []).map((e: any) => ({ ...e, tech_stack: e.tech_stack || [] }))
                        : data[field as keyof CandidateFormValues];

                    if (JSON.stringify(lastSaved[field as keyof CandidateFormValues]) !== JSON.stringify(newValue)) {
                        payload[field] = newValue;
                    }
                });
                console.log("payload: ", payload)
                if (Object.keys(payload).length > 0) {
                    // Cancel previous request if pending
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                    }

                    abortControllerRef.current = new AbortController();
                    updateMutation.mutate(payload);
                }
            }
        };

        // Create debounced version only once
        if (!debouncedHandleSaveRef.current) {
            debouncedHandleSaveRef.current = debounce(handleSave, 1000);
        }

        const subscription = methods.watch((data) => {
            debouncedHandleSaveRef.current?.(data);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [methods, updateMutation]);

    return (
        <FormProvider {...methods}>
            <div className="overflow-hidden"  style={{backgroundColor: '#F2F0EC'}}>
                <ProfileEditor
                    isDataLoading={false}
                    isDataSaving={updateMutation.isPending}
                    templateDoc={templateDoc}
                    themeDoc={themeDoc}
                    profileId={id}
                    onPreviewClick={()=>{
                        router.push(
                            `/profiles/${id}/edit/preview`
                        )
                    }}
                />
            </div>
        </FormProvider>
    );
}
