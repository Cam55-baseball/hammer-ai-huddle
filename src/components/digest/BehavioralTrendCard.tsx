import { Brain } from "lucide-react";
import { DigestCardShell } from "./DigestCardShell";
import { behavioralTrendSentence } from "@/lib/digest/sentences";
import type { DigestProjection } from "@/lib/digest/projections";

export function BehavioralTrendCard({ projection }: { projection: DigestProjection }) {
  return (
    <DigestCardShell
      title="Behavioral trend"
      icon={<Brain className="h-4 w-4 text-primary" />}
      projection={projection}
      sentence={behavioralTrendSentence(projection)}
    />
  );
}
