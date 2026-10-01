import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SpotlightTour, type TourStep } from "@/components/tour/SpotlightTour";

/**
 * Staff-only mechanics preview. Step text is DRAFT placeholder naming the
 * proposed story beats only — final copy waits for owner approval.
 * One step targets a missing element to prove graceful skipping.
 */
const STEPS: TourStep[] = [
  { id: "home", target: '[data-tour="home"]', title: "Draft: Your athlete home", body: "Placeholder — owner copy pending." },
  { id: "missing", target: '[data-tour="does-not-exist"]', title: "Missing target", body: "Never shown." },
  { id: "hammer", target: '[data-tour="hammer"]', title: "Draft: Update Hammer", body: "Placeholder — owner copy pending." },
  { id: "upload", target: '[data-tour="upload"]', title: "Draft: Upload and analyze", body: "Placeholder — owner copy pending." },
  { id: "scrolled", target: '[data-tour="scrolled"]', title: "Draft: Inside a scroll box", body: "Placeholder — owner copy pending." },
  { id: "edge", target: '[data-tour="edge"]', title: "Draft: Near the screen edge", body: "Placeholder — owner copy pending." },
];

export default function TourPreview() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-md space-y-6 p-4 pb-40">
      <Button data-tour="home" className="min-h-11 w-full" onClick={() => setOpen(true)}>Start tour preview</Button>
      <div data-tour="hammer" className="rounded-xl border bg-card p-4">Update Hammer card</div>
      <div className="h-[60vh]" />
      <div data-tour="upload" className="rounded-xl border bg-card p-4">Upload your video card</div>
      <div className="h-48 overflow-y-auto rounded-xl border p-2">
        <div className="h-96" />
        <div data-tour="scrolled" className="rounded-lg bg-muted p-3">Target inside a scroll box</div>
        <div className="h-40" />
      </div>
      <div className="h-[40vh]" />
      <div data-tour="edge" className="ml-auto w-24 rounded-lg border bg-card p-2 text-xs">Edge</div>
      <SpotlightTour tourId="preview" steps={STEPS} open={open} onClose={() => setOpen(false)} userId={user?.id} />
    </div>
  );
}
