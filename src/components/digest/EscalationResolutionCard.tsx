import { AlertTriangle, ShieldCheck } from "lucide-react";
import { DigestCardShell } from "./DigestCardShell";
import {
  escalationEmergenceSentence,
  escalationResolutionSentence,
} from "@/lib/digest/sentences";
import type { DigestProjection } from "@/lib/digest/projections";

export function EscalationResolutionCard({
  emerged,
  resolved,
}: {
  emerged: DigestProjection;
  resolved: DigestProjection;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <DigestCardShell
        title="Escalations emerged"
        icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
        projection={emerged}
        sentence={escalationEmergenceSentence(emerged)}
        emphasis={(emerged.value as number) > 0}
      />
      <DigestCardShell
        title="Escalations resolved"
        icon={<ShieldCheck className="h-4 w-4 text-primary" />}
        projection={resolved}
        sentence={escalationResolutionSentence(resolved)}
      />
    </div>
  );
}
