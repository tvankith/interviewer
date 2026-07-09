import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";

export type SkillGroup = {
  category?: string;
  skills: string[];
};

type SkillsBuilderProps = {
  value: SkillGroup[];
  onChange: (value: SkillGroup[]) => void;
};

const SkillsBuilder = ({ value, onChange }: SkillsBuilderProps) => {
  return (
    <div className="space-y-3">
      {value.map((cat, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Input
              placeholder="Category (e.g. frontend)"
              value={cat.category}
              onChange={(e) => {
                const updated = [...value];
                updated[i] = {
                  ...updated[i],
                  category: e.target.value,
                };
                onChange(updated);
              }}
            />

            {cat.skills.map((skill, j) => (
              <Input
                key={j}
                value={skill}
                placeholder="Skill"
                onChange={(e) => {
                  const updated = [...value];
                  const skills = [...updated[i].skills];
                  skills[j] = e.target.value;

                  updated[i] = {
                    ...updated[i],
                    skills,
                  };

                  onChange(updated);
                }}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const updated = [...value];
                updated[i] = {
                  ...updated[i],
                  skills: [...updated[i].skills, ""],
                };
                onChange(updated);
              }}
            >
              + Add Skill
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange([...value, { category: "", skills: [""] }])
        }
      >
        + Add Category
      </Button>
    </div>
  );
};

export default SkillsBuilder;