import { HeartPulse } from "lucide-react";
import { DigestCardShell } from "./DigestCardShell";
import { recoveryContinuitySentence } from "@/lib/digest/sentences";
import type { DigestProjection } from "@/lib/digest/projections";

export function RecoveryContinuityCard({ projection }: { projection: DigestProjection }) {
  return (
    <DigestCardShell
      title="Recovery continuity"
      icon={<HeartPulse className="h-4 w-4 text-primary" />}
      projection={projection}
      sentence={recoveryContinuitySentence(projection)}
    />
  );
}
