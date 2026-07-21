/**
 * IqDefenderPositionEditor — role picker for selecting which defender (or the
 * ball track) receives the next click-to-place waypoint. Extracted from
 * IqSituationsAuthoring per Phase 4 §5.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DEFENSIVE_ROLES, type IqActorRole } from "@/lib/iq/types";

export type EditingTarget = IqActorRole | "ball" | null;

interface Props {
  editing: EditingTarget;
  onChange: (t: EditingTarget) => void;
}

export function IqDefenderPositionEditor({ editing, onChange }: Props) {
  return (
    <Card className="p-3 space-y-2">
      <Label>Editing target</Label>
      <div className="grid grid-cols-5 gap-1">
        <Button
          size="sm"
          variant={editing === "ball" ? "default" : "outline"}
          onClick={() => onChange("ball")}
        >
          Ball
        </Button>
        {DEFENSIVE_ROLES.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={editing === r ? "default" : "outline"}
            onClick={() => onChange(r)}
          >
            {r}
          </Button>
        ))}
      </div>
    </Card>
  );
}
