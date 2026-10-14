import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSmartBack } from "@/hooks/useSmartBack";
import { cn } from "@/lib/utils";

/** Visible Back that returns to exactly the previous screen (falls back to `fallback` on a fresh open). */
export function BackButton({ fallback = "/dashboard", label = "Back", className }: { fallback?: string; label?: string; className?: string }) {
  const back = useSmartBack(fallback);
  return (
    <Button type="button" variant="ghost" size="sm" data-nav-back onClick={back} className={cn("min-h-11 -ml-2 gap-1.5", className)}>
      <ArrowLeft className="h-4 w-4" />{label}
    </Button>
  );
}
