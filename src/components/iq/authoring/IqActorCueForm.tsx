/**
 * IqActorCueForm — per-actor cues editor (assignment, footwork, comm, eyes,
 * coaching note, common mistake, elite cue, secondary read). Extracted from
 * IqSituationsAuthoring per Phase 4 §5. Pure controlled component.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { ROLE_LABELS, type IqAssignment } from "@/lib/iq/types";
import type { DraftActor } from "./types";

const ASSIGNMENTS: IqAssignment[] = ["ball", "bag", "backup", "read", "execute", "idle"];
const FIELDS = [
  "footwork_cue", "communication_call", "coaching_note",
  "common_mistake", "elite_cue", "secondary_read", "eyes_target",
] as const;

interface Props {
  actor: DraftActor;
  onChange: (patch: Partial<DraftActor>) => void;
  onClearWaypoints: () => void;
}

export function IqActorCueForm({ actor, onChange, onClearWaypoints }: Props) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{ROLE_LABELS[actor.role]} ({actor.role})</h3>
        <Badge variant="outline">{actor.primary_path.length} waypoints</Badge>
      </div>
      <div>
        <Label>Assignment</Label>
        <Select
          value={actor.assignment}
          onValueChange={(v) => onChange({ assignment: v as IqAssignment })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASSIGNMENTS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {FIELDS.map((k) => (
        <div key={k}>
          <Label className="capitalize">{k.replace(/_/g, " ")}</Label>
          <Input
            value={actor[k]}
            onChange={(e) => onChange({ [k]: e.target.value } as Partial<DraftActor>)}
          />
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={onClearWaypoints}>
        <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear waypoints
      </Button>
    </Card>
  );
}
