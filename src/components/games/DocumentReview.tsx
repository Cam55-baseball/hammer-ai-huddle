import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { documentReviewRows, documentSelection } from "@/lib/games/documentReview";
import { Check } from "lucide-react";
const names = { at_bats: "At-bat", pitches: "Pitch", defense: "Defensive play", baserun: "Baserunning" };
const labels: Record<string, string> = { inning: "Inning", pa_no: "At-bat number", result: "Result", rbi: "Runs batted in", pitches_seen: "Pitches seen", exit_velo_mph: "Exit speed (mph)", launch_angle_deg: "Launch angle (degrees)", spray_angle_deg: "Ball direction (degrees)", batter_handedness: "Batting side", notes: "Notes", pitch_no: "Pitch number", pitch_type: "Pitch type", pitch_velo: "Pitch speed (mph)", zone: "Pitch zone", perspective: "Logged as", position: "Position", play_type: "Play type", event_type: "Event type", from_base: "From base", to_base: "To base" };
export function DocumentReview({ raw, busy, onConfirm }: { raw: unknown; busy: boolean; onConfirm: (selection: ReturnType<typeof documentSelection>) => Promise<void> }) {
  const rows = documentReviewRows(raw);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return <div className="space-y-3 mt-3">
    {rows.length === 0 && <p className="text-sm text-muted-foreground">No game entries found.</p>}
    {rows.map(row => {
      const key = `${row.kind}:${row.index}`;
      return <div key={key} className="border-t pt-3 space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox checked={selected.has(key)} disabled={busy || !row.valid} onCheckedChange={checked => setSelected(previous => { const next = new Set(previous); if (checked === true) next.add(key); else next.delete(key); return next; })} />
          {names[row.kind]} {row.index + 1}
        </label>
        <p className="text-xs text-muted-foreground">Logged by: Imported</p>
        {Object.entries(row.facts).map(([field, value]) => <p key={field} className="text-xs break-words"><span className="text-muted-foreground">{labels[field] ?? field.replaceAll("_", " ")}: </span>{value == null ? "Not recorded" : typeof value === "object" ? JSON.stringify(value) : String(value)}</p>)}
        {!row.valid && <p className="text-xs text-destructive">Missing required game details — this entry cannot be added.</p>}
      </div>;
    })}
    {rows.length > 0 && <Button size="sm" disabled={busy || selected.size === 0} onClick={() => void onConfirm(documentSelection(rows, selected))}><Check className="h-4 w-4 mr-2" />Add selected entries ({selected.size})</Button>}
  </div>;
}