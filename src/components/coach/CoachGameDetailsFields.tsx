import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GAME_NUM_FIELDS, GAME_TYPES, HOME_AWAY, PITCHING_FIELDS, PLAYER_NUM_FIELDS, POSITIONS, cleanDetails, hasDetails, type DetailsInput } from "@/lib/coach/coachGameDetails";

/** Saves cleaned details onto the coach's own saved game entries. Returns an error message or null. */
export async function saveGameDetails(entryIds: string[], input: DetailsInput): Promise<string | null> {
  const { details, error } = cleanDetails(input);
  if (error) return error;
  if (!hasDetails(details) || entryIds.length === 0) return null;
  const { error: e } = await (supabase as any).rpc("coach_game_add_details", { _entries: entryIds, _details: details });
  return e ? e.message.replace(/^.*?: /, "") : null;
}

function Num({ k, label, decimal, value, onChange, idPrefix }: { k: string; label: string; decimal?: boolean; value: string; onChange: (v: string) => void; idPrefix: string }) {
  return <div className="space-y-1">
    <Label htmlFor={`d-${idPrefix}${k}`} className="text-xs">{label}</Label>
    <Input id={`d-${idPrefix}${k}`} inputMode={decimal ? "decimal" : "numeric"} value={value} onChange={(e) => onChange(e.target.value.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, ""))} />
  </div>;
}

/**
 * "Add more details" — all optional, closed by default. scope "player" = one player's
 * own details + pitching line; "game" = game-wide details; "both" = everything.
 */
export function CoachGameDetailsFields({ value, onChange, scope, idPrefix = "", showNotes = true }: { value: DetailsInput; onChange: (v: DetailsInput) => void; scope: "player" | "game" | "both"; idPrefix?: string; showNotes?: boolean }) {
  const [open, setOpen] = useState(false);
  const set = (k: string, v: string) => onChange({ ...value, values: { ...value.values, [k]: v } });
  const game = scope !== "player";
  const player = scope !== "game";
  return <div className="rounded-md border border-dashed border-border" data-testid="add-more-details">
    <Button type="button" variant="ghost" size="sm" className="w-full justify-between" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
      Add more details (optional){open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </Button>
    {open && <div className="space-y-3 p-3 pt-0">
      {game && <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label htmlFor={`d-${idPrefix}ha`} className="text-xs">Home / Away</Label>
          <select id={`d-${idPrefix}ha`} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={value.home_away ?? ""} onChange={(e) => onChange({ ...value, home_away: e.target.value })}>
            <option value="">Not set</option>{HOME_AWAY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
        <div className="space-y-1"><Label htmlFor={`d-${idPrefix}gt`} className="text-xs">Game type</Label>
          <select id={`d-${idPrefix}gt`} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={value.game_type ?? ""} onChange={(e) => onChange({ ...value, game_type: e.target.value })}>
            <option value="">Not set</option>{GAME_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
        <div className="space-y-1"><Label htmlFor={`d-${idPrefix}venue`} className="text-xs">Field or park</Label>
          <Input id={`d-${idPrefix}venue`} value={value.venue ?? ""} onChange={(e) => onChange({ ...value, venue: e.target.value })} /></div>
        {GAME_NUM_FIELDS.map((f) => <Num key={f.key} k={f.key} label={f.label} decimal={f.decimal} value={value.values[f.key] ?? ""} onChange={(v) => set(f.key, v)} idPrefix={idPrefix} />)}
      </div>}
      {player && <>
        <div className="grid grid-cols-2 gap-2">
          {PLAYER_NUM_FIELDS.map((f) => <Num key={f.key} k={f.key} label={f.label} value={value.values[f.key] ?? ""} onChange={(v) => set(f.key, v)} idPrefix={idPrefix} />)}
        </div>
        <fieldset className="space-y-1"><legend className="text-xs font-medium">Positions played</legend>
          <div className="flex flex-wrap gap-1">{POSITIONS.map((p) => {
            const on = (value.positions ?? []).includes(p);
            return <Button key={p} type="button" size="sm" variant={on ? "default" : "outline"} aria-pressed={on} onClick={() => onChange({ ...value, positions: on ? (value.positions ?? []).filter((x) => x !== p) : [...(value.positions ?? []), p] })}>{p}</Button>;
          })}</div>
        </fieldset>
        <fieldset aria-label="Pitching line" className="space-y-2 rounded-md border border-border p-2">
          <legend className="px-1 text-xs font-medium">Pitching line (leave blank if they didn't pitch)</legend>
          <div className="grid grid-cols-2 gap-2">{PITCHING_FIELDS.map((f) => <Num key={f.key} k={f.key} label={f.label} value={value.values[f.key] ?? ""} onChange={(v) => set(f.key, v)} idPrefix={idPrefix} />)}</div>
        </fieldset>
      </>}
      {showNotes && <div className="space-y-1"><Label htmlFor={`d-${idPrefix}notes`} className="text-xs">Notes</Label>
        <Textarea id={`d-${idPrefix}notes`} rows={2} value={value.notes ?? ""} onChange={(e) => onChange({ ...value, notes: e.target.value })} /></div>}
      <p className="text-xs text-muted-foreground">Blank boxes are left out, never saved as zero. Pitch counts go in the main line above.</p>
    </div>}
  </div>;
}
