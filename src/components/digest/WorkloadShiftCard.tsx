import { Dumbbell } from "lucide-react";
import { DigestCardShell } from "./DigestCardShell";
import { workloadShiftSentence } from "@/lib/digest/sentences";
import type { DigestProjection } from "@/lib/digest/projections";

export function WorkloadShiftCard({ projection }: { projection: DigestProjection }) {
  return (
    <DigestCardShell
      title="Workload continuity"
      icon={<Dumbbell className="h-4 w-4 text-primary" />}
      projection={projection}
      sentence={workloadShiftSentence(projection)}
    />
  );
}
