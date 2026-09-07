/**
 * Dev-only evidence page — renders the Arm Care library dialog open so the
 * scroll behaviour can be driven under real touch input, not just screenshotted.
 */
import { ArmCareLibraryDialog } from "@/components/hammer/ArmCareLibraryDialog";

export default function EvidenceArmCare() {
  return (
    <main className="p-4">
      <h1 className="text-lg font-semibold">Arm care library — isolated render</h1>
      <ArmCareLibraryDialog open onOpenChange={() => {}} sport="baseball" />
    </main>
  );
}
