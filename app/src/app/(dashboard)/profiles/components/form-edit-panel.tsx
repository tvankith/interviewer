"use client";

import { Card } from "@/components/ui/card";
import TabsNav from "@/components/basic/tabs-nav";
import { FORM_SECTIONS, DESIGN_SECTIONS, FLAT_SECTIONS, type SectionId } from "./profile-sections";
import SectionFormContent from "./section-form-content";
import { useEffect, useState } from "react";
import ResumeCanvas from "@/resume-engine/render/resume-canvas";
import type { ResumeData } from "@/resume-engine/types/resume-data";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";
import type { ResumeDiffHostValue } from "@/resume-engine/registry/diff-overlay";
import { CandidateFormValues } from "../profile/compose/types";
import type { UseFormSetValue } from "react-hook-form";
import { Pen } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
    activeSection: SectionId;
    onSelectSection: (id: string) => void;
    values: CandidateFormValues;
    templateDoc: TemplateDocument;
    themeDoc: ThemeDocument;
    setValue: UseFormSetValue<CandidateFormValues>;
    /** Set while a proposal is under canvas diff review; null/undefined otherwise. */
    activeReview?: { proposedFields: Record<string, unknown>; diffHost: ResumeDiffHostValue } | null;
    onFinishReview?: () => void;
};

export default function FormEditPanel({ activeSection, onSelectSection, values, templateDoc, themeDoc, setValue, activeReview, onFinishReview }: Props) {
    const [tab, setTab] = useState("preview")

    // A proposal entering review should surface its diff immediately, even
    // if the candidate was on the "edit" (form) tab.
    useEffect(() => {
        if (activeReview) setTab("preview");
    }, [activeReview]);

    return (
        <div className="flex h-full w-full overflow-auto">
            {/* Left Sidebar */}
            <div className="flex flex-col gap-2 py-2 px-2 border-r">
                <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setTab(tab === "edit" ? "preview" : "edit")}
                    title={tab === "edit" ? "Switch to preview mode" : "Switch to edit mode"}
                >
                    <Pen className="w-4 h-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 w-full">
                {tab === "edit" &&
                    <Card className="h-full">
                        <div className="grid grid-rows-[60px_1fr] grid-cols-[minmax(0,1fr)] h-full min-h-0 w-full">
                            <TabsNav
                                groups={[
                                    { id: "information", items: [...FORM_SECTIONS] },
                                    { id: "design", items: [...DESIGN_SECTIONS] },
                                ]}
                                activeId={activeSection}
                                onSelect={(id) => onSelectSection(id)}
                                vertical={false}
                            />

                            {FLAT_SECTIONS
                                .filter((section) => section.id === activeSection)
                                .map((section) => (
                                    <div
                                        key={section.id}
                                        id={`section-${section.id}`}
                                        className="border-b last:border-b-0 w-full overflow-y-auto min-h-0"
                                    >
                                        <div className="px-5 py-5">
                                            <SectionFormContent sectionId={section.id as SectionId} />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </Card>}
                {tab === "preview" && (
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                        {activeReview ? (
                            <>
                                <div className="mb-3 flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                                    <span>Reviewing proposed changes — accept or reject each one, then finish.</span>
                                    <Button size="sm" onClick={onFinishReview}>Done reviewing</Button>
                                </div>
                                <ResumeCanvas
                                    data={{ ...(values as ResumeData), ...activeReview.proposedFields } as ResumeData}
                                    previousData={values as ResumeData}
                                    templateDoc={templateDoc}
                                    themeDoc={themeDoc}
                                    mode="diff"
                                    diffHost={activeReview.diffHost}
                                />
                            </>
                        ) : (
                            <ResumeCanvas
                                data={values as ResumeData}
                                templateDoc={templateDoc}
                                themeDoc={themeDoc}
                                mode="interactive"
                                onEdit={(binding, value) => setValue(binding as never, value as never, { shouldDirty: true })}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
