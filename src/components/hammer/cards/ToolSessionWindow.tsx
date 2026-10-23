import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Eye, Timer } from "lucide-react";

/** A same-origin tool window uses the existing authenticated module and its canonical saves. */
export function ToolSessionWindow({ label, route, kind }: { label: string; route: string; kind: "vision" | "timing" | "practice" }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const close = (value: boolean) => {
    setOpen(value);
    if (!value) {
      void qc.invalidateQueries({ queryKey: ["tex-vision-progress"] });
      void qc.invalidateQueries({ queryKey: ["royal-timing-reminder"] });
      void qc.invalidateQueries({ queryKey: ["performance-sessions"] });
    }
  };
  const Icon = kind === "vision" ? Eye : kind === "timing" ? Timer : Camera;
  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Icon className="mr-1 h-4 w-4" />{label}</Button>
    <Dialog open={open} onOpenChange={close}><DialogContent className="z-[70] flex h-[95dvh] w-[calc(100%-1rem)] max-w-3xl flex-col p-3">
      <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
      <iframe src={route} title={label} allow="camera; microphone; fullscreen" className="min-h-0 w-full flex-1 border-0" />
      <Button size="sm" variant="outline" onClick={() => close(false)}>Return to exercise</Button>
    </DialogContent></Dialog>
  </>;
}