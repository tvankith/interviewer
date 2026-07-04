"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { debounce } from "lodash";
import ProfileEditor from "@/app/(dashboard)/profiles/components/profile-editor";
import { CandidateFormValues } from "@/app/(dashboard)/profiles/profile/compose/types";
import { saveToDB, getFromDB } from "@/lib/indexdb";

const STORAGE_KEY = "profileDraft";

type Props = {
    id?: string;
    initialData: CandidateFormValues;
    template: string;
};

export default function ResumeForm({
    initialData,
    template,
}: Props) {
    const router = useRouter();
    const [loadedData, setLoadedData] = useState<CandidateFormValues | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const lastSavedDataRef = useRef<CandidateFormValues | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const debouncedHandleSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

    const methods = useForm<CandidateFormValues>({
        defaultValues: initialData,
    });

    useEffect(() => {
        const loadDraft = async () => {
            try {
                const data = await getFromDB(STORAGE_KEY);
                const draftData = data || null;
                setLoadedData(draftData);
                lastSavedDataRef.current = draftData;
                if (draftData) {
                    methods.reset(draftData);
                }
            } catch (error) {
                console.error("Failed to load draft from IndexedDB:", error);
                setLoadedData(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadDraft();
    }, [methods]);

    /* ---------------- DEBOUNCED AUTO-SAVE ON CHANGE ---------------- */
    useEffect(() => {
        const handleSave = async (data: CandidateFormValues) => {
            if (JSON.stringify(lastSavedDataRef.current) !== JSON.stringify(data)) {
                setIsSaving(true);
                try {
                    await saveToDB(STORAGE_KEY, data);
                    lastSavedDataRef.current = data;
                } catch (error) {
                    console.error("Failed to save draft to IndexedDB:", error);
                } finally {
                    setIsSaving(false);
                }
            }
        };

        if (!debouncedHandleSaveRef.current) {
            debouncedHandleSaveRef.current = debounce(handleSave, 1000);
        }

        const subscription = methods.watch((data) => {
            debouncedHandleSaveRef.current?.(data);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [methods]);

    const handlePreviewClick = useCallback(async () => {
        try {
            router.push(`/resume-generator/preview`);
        } catch (error) {
            console.error("Failed to navigate to preview:", error);
        }
    }, [router]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <FormProvider {...methods}>
            <ProfileEditor
                isDataLoading={false}
                isDataSaving={isSaving}
                onPreviewClick={handlePreviewClick}
                template={template}
            />
        </FormProvider>
    );
}