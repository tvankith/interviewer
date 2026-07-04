"use client";

import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    Check,
} from "lucide-react";
import SectionFormContent from "./section-form-content";
import { FLAT_SECTIONS, type SectionId } from "./profile-sections";

type Props = {
    activeSection: SectionId;
    onSectionChange: (id: SectionId) => void;
    isDataSaving?: boolean;
    onSubmit?: () => void;
};

export default function ProfileFormPanel({
    activeSection,
    onSectionChange,
    isDataSaving,
    onSubmit,
}: Props) {

    const sectionIdx = FLAT_SECTIONS.findIndex((s) => s.id === activeSection);
    const prevSection = sectionIdx > 0 ? FLAT_SECTIONS[sectionIdx - 1] : null;
    const nextSection = sectionIdx < FLAT_SECTIONS.length - 1 ? FLAT_SECTIONS[sectionIdx + 1] : null;

    const handlePrevClick = () => {
        if (prevSection) {
            onSectionChange(prevSection.id as SectionId);
        }
    };

    const handleNextClick = () => {
        if (nextSection) {
            onSectionChange(nextSection.id as SectionId);
        }
    };

    return (
        <div className="shrink-0 border-r bg-card flex flex-col max-h-[calc(100vh-4rem)]">
            {/* Section header */}
            <div className="shrink-0 border-b px-5 pt-4 pb-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[17px] font-bold tracking-tight text-foreground">
                        {FLAT_SECTIONS[sectionIdx]?.label}
                    </h2>
                </div>
            </div>

            {/* Form content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
                <SectionFormContent sectionId={activeSection} />
            </div>

            {/* Prev / Next footer */}
            <div className="shrink-0 border-t px-4 py-3 flex justify-between items-center">
                {prevSection ? (
                    <button
                        onClick={handlePrevClick}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold rounded-lg border border-border bg-muted hover:bg-muted/80 text-foreground transition-colors"
                    >
                        <ChevronLeft size={13} />
                        {prevSection.label}
                    </button>
                ) : (
                    <div />
                )}
                {nextSection ? (
                    <button
                        onClick={handleNextClick}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        {nextSection.label}
                        <ChevronRight size={13} />
                    </button>
                ) : (
                    <button
                        onClick={onSubmit}
                        disabled={isDataSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isDataSaving ? (
                            <Loader2 size={13} className="animate-spin" />
                        ) : (
                            <Check size={13} />
                        )}
                        {isDataSaving ? "Saving..." : "Done"}
                    </button>
                )}
            </div>
        </div>
    );
}
