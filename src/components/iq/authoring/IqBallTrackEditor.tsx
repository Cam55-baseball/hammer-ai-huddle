/**
 * IqBallTrackEditor — clear/summary card for the ball track waypoints.
 * Click-to-append lives on the field overlay in the parent page. Extracted
 * from IqSituationsAuthoring per Phase 4 §5.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

interface Props {
  track: { x: number; y: number; t?: number }[];
  onClear: () => void;
}

export function IqBallTrackEditor({ track, onClear }: Props) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Ball track</h3>
        <Badge variant="outline">{track.length} points</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Click the field to add each ball position in order. The playback clock
        spaces them evenly.
      </p>
      <Button size="sm" variant="outline" onClick={onClear}>
        <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear track
      </Button>
    </Card>
  );
}
