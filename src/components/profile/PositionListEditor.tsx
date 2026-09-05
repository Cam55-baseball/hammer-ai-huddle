/**
 * Positions I play — an ordered list, primary first. Multi-position athletes
 * (most youth players) can list everything they actually play, and the defense
 * plan uses the primary while offering the others as a one-tap swap.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, X } from "lucide-react";
import { POSITION_ORDER, positionLabel, positionShort } from "@/lib/drills/positionLabels";
import { useAthletePositions } from "@/hooks/useAthletePositions";

export function PositionListEditor() {
  const { positions, loading, savePositions } = useAthletePositions();
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setDraft(positions), [positions]);

  const toggle = (code: string) =>
    setDraft((d) => (d.includes(code) ? d.filter((c) => c !== code) : [...d, code]));

  const makePrimary = (code: string) =>
    setDraft((d) => [code, ...d.filter((c) => c !== code)]);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await savePositions(draft);
      toast.success("Positions saved");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't save.");
    } finally {
      setSaving(false);
    }
  };

  const dirty = draft.join(",") !== positions.join(",");

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Positions I play</p>
        <p className="text-xs text-muted-foreground">
          Tap everything you actually play. The first one is your main position and drives your
          defense plan — use the arrow to move a different one to the front.
        </p>
      </div>

      {draft.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {draft.map((code, i) => (
            <Badge key={code} variant={i === 0 ? "default" : "secondary"} className="gap-1 py-1">
              {i === 0 && <span className="text-[10px] uppercase tracking-wide">Main</span>}
              {positionLabel(code)}
              {i !== 0 && (
                <button type="button" onClick={() => makePrimary(code)} aria-label={`Make ${positionShort(code)} my main position`}>
                  <ArrowUp className="h-3 w-3" />
                </button>
              )}
              <button type="button" onClick={() => toggle(code)} aria-label={`Remove ${positionShort(code)}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {POSITION_ORDER.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => toggle(code)}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              draft.includes(code)
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {code}
          </button>
        ))}
      </div>

      {err && <p className="text-xs text-destructive">{err}</p>}

      <Button size="sm" onClick={save} disabled={saving || loading || !dirty}>
        {saving ? "Saving…" : "Save positions"}
      </Button>
    </div>
  );
}
