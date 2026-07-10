import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import RichTextEditor from "./rich-text-editor";
import ChipInput from "./chip-input";
import type { RichTextValue } from "@/resume-engine/types/lexical";

/* ================= TYPES ================= */

export type Project = {
    name?: string;
    description?: RichTextValue;
    tech_stack: string[];
};

type Props = {
    value: Project[];
    onChange: (projects: Project[]) => void;
};

/* ================= COMPONENT ================= */

export default function ProjectBuilder({ value = [], onChange }: Props) {
    const handleAdd = () => {
        onChange([...(value || []), { tech_stack: [] }]);
    };

    const handleRemove = (index: number) => {
        const updated = [...value];
        updated.splice(index, 1);
        onChange(updated);
    };

    const handleChange = (
        index: number,
        key: keyof Omit<Project, "tech_stack">,
        val: string | RichTextValue
    ) => {
        const updated = [...value];
        updated[index] = {
            ...updated[index],
            [key]: val,
        };
        onChange(updated);
    };

    const handleTechStackChange = (index: number, val: string[]) => {
        const updated = [...value];
        updated[index] = { ...updated[index], tech_stack: val };
        onChange(updated);
    };

    return (
        <div>
            <div className="flex justify-between items-center">
                <Button type="button" onClick={handleAdd}>
                    Add Project
                </Button>
            </div>

            {(value || []).map((project, index) => (
                <Card key={index} className="mt-3">
                    <CardContent className="space-y-2 pt-4">
                        <Input
                            value={project.name || ""}
                            onChange={(e) =>
                                handleChange(index, "name", e.target.value)
                            }
                            placeholder="Project Name"
                        />

                        <RichTextEditor
                            format="lexical"
                            value={project.description}
                            onChange={(state) =>
                                handleChange(index, "description", state)
                            }
                            placeholder="Description"
                        />

                        <ChipInput
                            value={project.tech_stack}
                            onChange={(val) => handleTechStackChange(index, val)}
                            placeholder="Add technology..."
                        />

                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleRemove(index)}
                        >
                            Remove
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
