import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import RichTextEditor from "./rich-text-editor";
import ChipInput from "./chip-input";
import type { RichTextValue } from "@/resume-engine/types/lexical";

export type Experience = {
    company?: string;
    role?: string;
    start_date?: string;
    end_date?: string;
    description?: RichTextValue;
    tech_stack: string[];
};

type Props = {
    value: Experience[];
    onChange: (val: Experience[]) => void;
};

type ItemProps = {
    id: string;
    exp: Experience;
    index: number;
    onRemove: (index: number) => void;
    onChange: (index: number, key: keyof Omit<Experience, "tech_stack">, val: string | RichTextValue) => void;
    onTechStackChange: (index: number, val: string[]) => void;
};

function SortableExperience({ id, exp, index, onRemove, onChange, onTechStackChange }: ItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card className="mt-3 relative">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(index)}
                >
                    <X className="size-4" />
                </Button>

                <CardContent className="space-y-2 pt-4">
                    <div
                        className="flex justify-end cursor-grab active:cursor-grabbing text-muted-foreground select-none"
                        {...attributes}
                        {...listeners}
                    >
                        ⠿
                    </div>

                    <Input
                        value={exp.company || ""}
                        onChange={(e) => onChange(index, "company", e.target.value)}
                        placeholder="Company"
                    />

                    <Input
                        value={exp.role || ""}
                        onChange={(e) => onChange(index, "role", e.target.value)}
                        placeholder="Role"
                    />

                    <Input
                        value={exp.start_date || ""}
                        onChange={(e) => onChange(index, "start_date", e.target.value)}
                        placeholder="Start Date"
                    />

                    <Input
                        value={exp.end_date || ""}
                        onChange={(e) => onChange(index, "end_date", e.target.value)}
                        placeholder="End Date"
                    />

                    <RichTextEditor
                        format="lexical"
                        value={exp.description}
                        onChange={(state) => onChange(index, "description", state)}
                        placeholder={["Tell me about your experience", exp.company && ` in ${exp.company}`].join(" ")}
                    />

                    <ChipInput
                        value={exp.tech_stack}
                        onChange={(val) => onTechStackChange(index, val)}
                        placeholder="Add technology..."
                    />
                </CardContent>
            </Card>
        </div>
    );
}

export default function ExperienceBuilder({ value = [], onChange }: Props) {
    const sensors = useSensors(useSensor(PointerSensor));

    const ids = value.map((_, i) => String(i));

    const handleAdd = () => {
        onChange([...value, { tech_stack: [] }]);
    };

    const handleRemove = (index: number) => {
        const updated = [...value];
        updated.splice(index, 1);
        onChange(updated);
    };

    const handleChange = (index: number, key: keyof Omit<Experience, "tech_stack">, val: string | RichTextValue) => {
        const updated = [...value];
        updated[index] = { ...updated[index], [key]: val };
        onChange(updated);
    };

    const handleTechStackChange = (index: number, val: string[]) => {
        const updated = [...value];
        updated[index] = { ...updated[index], tech_stack: val };
        onChange(updated);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        onChange(arrayMove(value, oldIndex, newIndex));
    };

    return (
        <div>
            <div className="flex justify-between items-center">
                <Button type="button" onClick={handleAdd}>
                    Add Experience
                </Button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    {value.map((exp, index) => (
                        <SortableExperience
                            key={index}
                            id={String(index)}
                            exp={exp}
                            index={index}
                            onRemove={handleRemove}
                            onChange={handleChange}
                            onTechStackChange={handleTechStackChange}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    );
}
