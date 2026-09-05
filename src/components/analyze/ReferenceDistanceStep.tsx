import { useEffect, useMemo, useState } from "react";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Ruler } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_DISTANCE_FT,
  isValidDistance,
  MAX_DISTANCE_FT,
  MIN_DISTANCE_FT,
  REFERENCE_DISTANCE_HELP,
  referenceDistancePresets,
  type ReferenceSport,
} from "@/lib/capture/referenceDistance";

const MANUAL = "manual";

interface ReferenceDistanceStepProps {
  sport: ReferenceSport;
  /** Current distance in feet, or null when the athlete opted out. */
  value: number | null;
  onChange: (feet: number | null) => void;
  className?: string;
}

/**
 * Inline step that collects the one real-world measurement ball-speed math
 * needs. Lives inside the capture flow — never a separate page to hunt for.
 * Fully skippable: mechanics feedback works without it.
 */
export function ReferenceDistanceStep({ sport, value, onChange, className }: ReferenceDistanceStepProps) {
  // Pre-release lockdown: ball-speed measurement spends real inference credits
  // and is unvalidated, so only owner/admin may switch it on.
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const staffOnly = isOwner || isAdmin;
  const gateLoading = ownerLoading || adminLoading;

  const presets = useMemo(() => referenceDistancePresets(sport), [sport]);
  const [enabled, setEnabled] = useState(value != null);
  const [selection, setSelection] = useState<string>(() => {
    const match = presets.find((p) => p.feet === (value ?? DEFAULT_DISTANCE_FT[sport]));
    return match ? match.id : MANUAL;
  });
  const [manual, setManual] = useState<string>(() => (value != null ? String(value) : ""));

  // Sport switch re-seeds the default without erasing an explicit choice.
  useEffect(() => {
    if (!enabled) return;
    const fallback = DEFAULT_DISTANCE_FT[sport];
    const match = presets.find((p) => p.feet === fallback);
    if (match) {
      setSelection(match.id);
      onChange(match.feet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    if (!next) {
      onChange(null);
      return;
    }
    const fallback = DEFAULT_DISTANCE_FT[sport];
    const match = presets.find((p) => p.feet === fallback);
    setSelection(match ? match.id : MANUAL);
    onChange(match ? match.feet : fallback);
  };

  const handleSelect = (next: string) => {
    setSelection(next);
    if (next === MANUAL) {
      const parsed = Number(manual);
      onChange(isValidDistance(parsed) ? parsed : null);
      return;
    }
    const preset = presets.find((p) => p.id === next);
    onChange(preset ? preset.feet : null);
  };

  const handleManual = (raw: string) => {
    setManual(raw);
    const parsed = Number(raw);
    onChange(isValidDistance(parsed) ? parsed : null);
  };

  // Never leave a stale distance armed for a non-staff athlete.
  useEffect(() => {
    if (!gateLoading && !staffOnly && value != null) {
      setEnabled(false);
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateLoading, staffOnly, value]);

  if (gateLoading || !staffOnly) return null;

  const manualInvalid = selection === MANUAL && manual.trim() !== "" && !isValidDistance(Number(manual));

  return (
    <Card className={className}>
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Ruler className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Measure ball speed too?</p>
              <p className="text-xs text-muted-foreground max-w-md mt-1">{REFERENCE_DISTANCE_HELP}</p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} aria-label="Measure ball speed" />
        </div>

        {enabled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Pitching distance on your field</Label>
              <Select value={selection} onValueChange={handleSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a distance" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={MANUAL}>Something else — I'll type it</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selection === MANUAL && (
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="manual-reference-distance">
                  Distance in feet
                </Label>
                <Input
                  id="manual-reference-distance"
                  inputMode="decimal"
                  placeholder="e.g. 46"
                  value={manual}
                  onChange={(e) => handleManual(e.target.value)}
                />
                {manualInvalid && (
                  <p className="text-xs text-destructive">
                    Enter a distance between {MIN_DISTANCE_FT} and {MAX_DISTANCE_FT} feet.
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground sm:col-span-2">
              {value != null
                ? `We'll measure against ${value} ft. Mechanics feedback runs either way.`
                : "Pick or type a distance to unlock ball speed. Mechanics feedback still runs without it."}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
