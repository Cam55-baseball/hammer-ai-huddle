import { Gauge } from "lucide-react";
import { DigestCardShell } from "@/components/digest/DigestCardShell";
import {
  escalationPersistenceSentence,
  FORECAST_BOUNDARY_DISCLAIMER,
} from "@/lib/digest/sentences";
import type { DigestProjection } from "@/lib/digest/projections";

export function ProjectionConfidenceCard({ projection }: { projection: DigestProjection }) {
  return (
    <DigestCardShell
      title="Escalation persistence"
      icon={<Gauge className="h-4 w-4 text-destructive" />}
      projection={projection}
      sentence={`${escalationPersistenceSentence(projection)} ${FORECAST_BOUNDARY_DISCLAIMER}`}
    />
  );
}
