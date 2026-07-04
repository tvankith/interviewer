import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FieldContent } from "@/components/ui/field"; // adjust if needed
import { UseFormRegister } from "react-hook-form";

type JobDescriptionInputProps = {
  register: UseFormRegister<any>;
  onDraft?: () => void;
};

export default function JobDescriptionInput({
  register,
  onDraft,
}: JobDescriptionInputProps) {
  return (
    <div className="border rounded-2xl p-4 flex flex-col gap-4">
      {/* Textarea */}
      <FieldContent className="p-0! border-none">
        <Textarea
          id="jobDescription"
          {...register("jobDescription")}
          placeholder="Paste job description..."
          className="min-h-40 resize-none border-none focus-visible:ring-0 shadow-none"
        />
      </FieldContent>

      {/* Bottom Action */}
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={onDraft}>
          Draft
        </Button>
      </div>
    </div>
  );
}