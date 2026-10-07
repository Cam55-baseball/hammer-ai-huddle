import { Rocket } from "lucide-react";
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
      className="font-bold gap-2 shrink-0"
      aria-label="Start Here"
      title="Start Here"
    >
      <Rocket className="h-4 w-4" />
      <span className="hidden min-[380px]:inline">Start Here</span>
    </Button>
  );
}
