import { Activity } from "lucide-react";
import { DigestCardShell } from "./DigestCardShell";
import { organismChangeSentence } from "@/lib/digest/sentences";
import type { DigestProjection } from "@/lib/digest/projections";

export function OrganismChangeCard({ projection }: { projection: DigestProjection }) {
  return (
    <DigestCardShell
      title="Organism change"
      icon={<Activity className="h-4 w-4 text-primary" />}
      projection={projection}
      sentence={organismChangeSentence(projection)}
    />
  );
}
