import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import RichTextEditor from "./rich-text-editor";

export type Education = {
    institute?: string;
    course?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
};

type Props = {
    value: Education[];
    onChange: (val: Education[]) => void;
};

export default function EducationBuilder({ value = [], onChange }: Props) {
    const handleAdd = () => {
        onChange([...value, {}]);
    };

    const handleRemove = (index: number) => {
        const updated = [...value];
        updated.splice(index, 1);
        onChange(updated);
    };

    const handleChange = (index: number, key: keyof Education, val: string) => {
        const updated = [...value];
        updated[index] = { ...updated[index], [key]: val };
        onChange(updated);
    };

    return (
        <div>
            <Button type="button" onClick={handleAdd}>
                Add Education
            </Button>

            {value.map((edu, index) => (
                <Card key={index} className="mt-3">
                    <CardContent className="space-y-2 pt-4">
                        <Input
                            value={edu.institute || ""}
                            onChange={(e) => handleChange(index, "institute", e.target.value)}
                            placeholder="Institute"
                        />

                        <Input
                            value={edu.course || ""}
                            onChange={(e) => handleChange(index, "course", e.target.value)}
                            placeholder="Course / Degree"
                        />

                        <Input
                            value={edu.start_date || ""}
                            onChange={(e) => handleChange(index, "start_date", e.target.value)}
                            placeholder="Start Date"
                        />

                        <Input
                            value={edu.end_date || ""}
                            onChange={(e) => handleChange(index, "end_date", e.target.value)}
                            placeholder="End Date"
                        />

                        <RichTextEditor
                            value={edu.description || ""}
                            onChange={(html) => handleChange(index, "description", html)}
                            placeholder="Description"
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
