import {
    User,
    AlignLeft,
    Cpu,
    Link2,
    GraduationCap,
    FolderOpen,
    Briefcase,
    Palette,
} from "lucide-react";
import { type StepNavItem } from "@/components/basic/step-nav";

export const FORM_SECTIONS = [
    { id: "basic",      label: "Basic Info",  Icon: User },
    { id: "summary",    label: "Summary",     Icon: AlignLeft },
    { id: "skills",     label: "Skills",      Icon: Cpu },
    { id: "links",      label: "Links",       Icon: Link2 },
    { id: "education",  label: "Education",   Icon: GraduationCap },
    { id: "projects",   label: "Projects",    Icon: FolderOpen },
    { id: "experience", label: "Experience",  Icon: Briefcase },
] as const;

export const DESIGN_SECTIONS = [
    { id: "template", label: "Template", Icon: Palette },
] as const;

export const FLAT_SECTIONS: StepNavItem[] = [...FORM_SECTIONS, ...DESIGN_SECTIONS];

export type SectionId = typeof FORM_SECTIONS[number]["id"] | typeof DESIGN_SECTIONS[number]["id"];
