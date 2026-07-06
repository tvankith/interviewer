"use client";

import { Card } from "@/components/ui/card";
import TabsNav from "@/components/basic/tabs-nav";
import { FORM_SECTIONS, DESIGN_SECTIONS, FLAT_SECTIONS, type SectionId } from "./profile-sections";
import SectionFormContent from "./section-form-content";
import { useState } from "react";
import ResumeCanvas from "@/resume-engine/render/resume-canvas";
import type { ResumeData } from "@/resume-engine/types/resume-data";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";
import { CandidateFormValues } from "../profile/compose/types";
import type { UseFormSetValue } from "react-hook-form";
import { Menu, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderResumeHtmlApi, generateLexicalPdfApi } from "@/apis/resume-pdf";

type Props = {
    activeSection: SectionId;
    onSelectSection: (id: string) => void;
    values: CandidateFormValues;
    templateDoc: TemplateDocument;
    themeDoc: ThemeDocument;
    setValue: UseFormSetValue<CandidateFormValues>;
    onPreviewClick?: () => void;
};

export default function FormEditPanel({ activeSection, onSelectSection, values, templateDoc, themeDoc, setValue, onPreviewClick }: Props) {
    const [tab, setTab] = useState("preview")
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadError, setDownloadError] = useState<string | null>(null)

    const handleDownloadClick = async () => {
        setIsMenuOpen(false);
        setIsDownloading(true);
        setDownloadError(null);
        try {
            const html = await renderResumeHtmlApi({ templateDoc, themeDoc, data: values as ResumeData });
            const url = await generateLexicalPdfApi(html);
            const link = document.createElement("a");
            link.href = url;
            link.download = "resume.pdf";
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            setDownloadError("Failed to generate PDF");
        } finally {
            setIsDownloading(false);
        }
    };

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
                            <button
                                onClick={handleDownloadClick}
                                disabled={isDownloading}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDownloading ? "Downloading..." : "Download PDF"}
                            </button>
                        </div>
                    )}
                    {downloadError && (
                        <div className="absolute left-full top-full mt-1 ml-2 w-48 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1 z-10">
                            {downloadError}
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
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                        <ResumeCanvas
                            data={values as ResumeData}
                            templateDoc={templateDoc}
                            themeDoc={themeDoc}
                            mode="interactive"
                            onEdit={(binding, value) => setValue(binding as never, value as never, { shouldDirty: true })}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
