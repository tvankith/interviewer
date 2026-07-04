// components/FormSubmitButton.tsx
import { Button } from "@/components/ui/button";

type Props = {
  isLoading?: boolean;
  loadingText?: string;
  text?: string;
  onClick?: () => void;
  children?: string;
  isPending?: boolean;
};

export function FormSubmitButton({
  isLoading,
  loadingText = "Submitting...",
  text,
  onClick,
}: Props) {
  return (
    <Button
      onClick={onClick}
      className="w-full"
      disabled={isLoading}
    >
      {isLoading ? loadingText : text}
    </Button>
  );
}