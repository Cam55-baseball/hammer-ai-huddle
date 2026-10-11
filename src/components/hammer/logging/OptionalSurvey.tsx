import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function OptionalSurvey({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div data-optional-survey>
    <Button type="button" variant="outline" size="sm" aria-expanded={open}
      onClick={() => setOpen((value) => !value)}>Survey (optional)</Button>
    <div hidden={!open} className="mt-2 space-y-2" data-survey-fields>{children}</div>
  </div>;
}