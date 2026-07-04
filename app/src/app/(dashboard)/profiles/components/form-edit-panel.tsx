"use client";

import { Card } from "@/components/ui/card";
import TabsNav from "@/components/basic/tabs-nav";
import { FORM_SECTIONS, DESIGN_SECTIONS, FLAT_SECTIONS, type SectionId } from "./profile-sections";
import SectionFormContent from "./section-form-content";
import { useState } from "react";
import ResumePreview from "./resume-preview";
import { CandidateFormValues } from "../profile/compose/types";
import { Menu, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
    activeSection: SectionId;
    onSelectSection: (id: string) => void;
    values: CandidateFormValues;
    template: string;
    onPreviewClick?: () => void;
};

export default function FormEditPanel({ activeSection, onSelectSection, values, template, onPreviewClick }: Props) {
    const [tab, setTab] = useState("preview")
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <div className="flex h-full w-full overflow-auto">
            {/* Left Sidebar */}
            <div className="flex flex-col gap-2 py-2 px-2 border-r">
                <div className="relative">
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        onBlur={() => setTimeout(() => setIsMenuOpen(false), 200)}
                        title="Menu"
                    >
                        <Menu className="w-4 h-4" />
                    </Button>
                    {isMenuOpen && (
                        <div className="absolute left-full top-0 ml-2 bg-white border border-gray-200 rounded-md shadow-md z-10 w-40">
                            <button
                                onClick={() => {
                                    onPreviewClick?.();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                            >
                                Preview PDF
                            </button>
                        </div>
                    )}
                </div>
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
                    <ResumePreview
                        profile={values}
                        template={template}
                        iframeClassName="w-full"
                    />
                )}
            </div>
        </div>
    );
}
