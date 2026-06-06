/**
 * HammerOnboardingChat — conversational knowledge-gap acquisition surface.
 *
 * Sprint: Coach Hammer Authority Consolidation (Section B). Replaces the
 * passive `HammerOnboardingPresence` renderer for the active onboarding path.
 *
 * One question at a time. Always skippable. Missingness preserved.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHammerOnboardingDirector } from "@/hooks/useHammerOnboardingDirector";
import { getHammerIdentity } from "@/lib/hammer/identity";

export function HammerOnboardingChat() {
  const identity = getHammerIdentity();
  const dir = useHammerOnboardingDirector();
  const [draft, setDraft] = useState<string>("");
  const [busy, setBusy] = useState(false);

  if (dir.isLoading || !dir.nextGap) {
    if (dir.openGaps.length === 0 && !dir.isLoading) return null;
    return null;
  }

  const gap = dir.nextGap;

  const submit = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const value = gap.inputKind === "number" ? Number(draft) : draft.trim();
      await dir.resolve(gap.id, value);
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{identity.voiceLabel} · onboarding</span>
          <span className="text-[10px] text-muted-foreground">
            {dir.resolvedCount} / {dir.totalGaps}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{gap.question}</p>
        {gap.helper && <p className="text-xs text-muted-foreground">{gap.helper}</p>}

        {gap.inputKind === "select" && gap.options ? (
          <Select value={draft} onValueChange={setDraft}>
            <SelectTrigger>
              <SelectValue placeholder="Pick one" />
            </SelectTrigger>
            <SelectContent>
              {gap.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={gap.inputKind === "number" ? "number" : "text"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your answer"
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        )}

        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => dir.skip(gap.id)} disabled={busy}>
            Skip
          </Button>
          <Button size="sm" onClick={submit} disabled={busy || !draft.trim()}>
            Save & next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
