import { Label } from "@/components/ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const DynamicList = ({
    label,
    values,
    setValues,
}: any) => {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>

            {values.map((val: string, idx: number) => (
                <div key={idx} className="flex gap-2">
                    <Input
                        value={val}
                        onChange={(e) => {
                            const updated = [...values];
                            updated[idx] = e.target.value;
                            setValues(updated);
                        }}
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() =>
                            setValues(values.filter((_: any, i: number) => i !== idx))
                        }
                    >
                        ✕
                    </Button>
                </div>
            ))}

            <Button
                type="button"
                variant="outline"
                onClick={() => setValues([...values, ""])}
            >
                + Add {label}
            </Button>
        </div>
    );
};

export default DynamicList