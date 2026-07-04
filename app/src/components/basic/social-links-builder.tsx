import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";

export type SocialLink = {
    url: string;
    social_media: string;
};

const SOCIAL_OPTIONS = ["linkedIN", "github", "twitter", "portfolio", "other"];

type Props = {
    value: SocialLink[];
    onChange: (val: SocialLink[]) => void;
};

export default function SocialLinksBuilder({ value = [], onChange }: Props) {
    const handleAdd = () => {
        onChange([...value, { url: "", social_media: "linkedIN" }]);
    };

    const handleRemove = (index: number) => {
        const updated = [...value];
        updated.splice(index, 1);
        onChange(updated);
    };

    const handleChange = (index: number, key: keyof SocialLink, val: string) => {
        const updated = [...value];
        updated[index] = { ...updated[index], [key]: val };
        onChange(updated);
    };

    return (
        <div>
            <Button type="button" onClick={handleAdd}>
                Add Social Link
            </Button>

            {value.map((link, index) => (
                <Card key={index} className="mt-3">
                    <CardContent className="space-y-2 pt-4">
                        <select
                            value={link.social_media}
                            onChange={(e) => handleChange(index, "social_media", e.target.value)}
                            className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                        >
                            {SOCIAL_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>

                        <Input
                            value={link.url}
                            onChange={(e) => handleChange(index, "url", e.target.value)}
                            placeholder="https://..."
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
