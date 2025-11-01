import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TutorialButtonProps {
  onClick: () => void;
}

export function TutorialButton({ onClick }: TutorialButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="font-bold gap-2"
      aria-label="Open tutorial"
    >
      <HelpCircle className="h-4 w-4" />
      Tutorial
    </Button>
  );
}
