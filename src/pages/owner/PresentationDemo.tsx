import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhaseStripView } from "@/components/hammer/AdaptivePhaseStrip";
import { DEMO_ATHLETES, buildDemo } from "@/lib/hammer/presentationDemo";

/** v1.4 §3 — demo picker for the presentation. Nothing here is saved. */
export default function PresentationDemo() {
  const [id, setId] = useState<string | null>(null);
  const [moved, setMoved] = useState(0);
  const [open, setOpen] = useState(false);
  const d = DEMO_ATHLETES.find((a) => a.id === id) ?? null;
  const v = useMemo(() => (d ? buildDemo(d, moved) : null), [d, moved]);

  if (!d || !v) {
    return (
      <main className="mx-auto max-w-md space-y-3 p-4">
        <h1 className="text-xl font-semibold text-foreground">Pick a demo athlete</h1>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="demo-picker">
          {DEMO_ATHLETES.map((a) => (
            <Button key={a.id} variant="outline" className="min-h-14 h-auto flex-col items-start py-2 text-left" onClick={() => { setId(a.id); setMoved(0); setOpen(false); }}>
              <span className="font-medium">{a.name}</span>
              <span className="text-xs text-muted-foreground">{a.label}</span>
            </Button>
          ))}
        </div>
      </main>
    );
  }

  const t = v.throwing;
  const ramp = v.plan.ramps?.find((r) => r.discipline === "throwing");
  return (
    <main className="mx-auto max-w-md space-y-3 p-4">
      <Button variant="ghost" className="min-h-11 px-2" onClick={() => setId(null)}>← All demo athletes</Button>
      <h1 className="text-xl font-semibold text-foreground">{d.name} · {d.label}</h1>
      <PhaseStripView plan={v.plan} open={open} onToggle={() => setOpen((o) => !o)} />
      {t.flag && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">{t.flag}</p>}
      {v.tournament && (
        <Card data-testid="tournament-budget">
          <CardHeader className="pb-1"><CardTitle className="text-base">Tournament weekend</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{v.tournament.line}</p>
            <p className="text-muted-foreground">Afterwards: {v.tournament.recoveryDays} recovery day{v.tournament.recoveryDays === 1 ? "" : "s"}, sized to what was thrown.</p>
          </CardContent>
        </Card>
      )}
      <Card data-testid="demo-today">
        <CardHeader className="pb-1"><CardTitle className="text-base">Today's plan</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {v.plan.disciplines.map((x) => (
            <div key={x.discipline} className="space-y-0.5">
              <div className="font-medium capitalize text-foreground">{x.discipline.replace("_", " ")}</div>
              <div className="text-foreground">{x.content}</div>
              {x.discipline === "throwing" && ramp && <div className="text-foreground">{ramp.line}</div>}
              <div className="text-muted-foreground">{x.why}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card data-testid="demo-arm">
        <CardHeader className="pb-1"><CardTitle className="text-base">Arm budget</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-foreground">
          <p>Today: {t.budgetUnit === "pitches" ? v.today.pitches : v.today.units} of {t.dailyBudget} {t.budgetUnit}{v.today.estimated ? " (estimated)" : ""}</p>
          <p>This week: up to {t.weeklyBudget} {t.budgetUnit}</p>
          <p className="text-muted-foreground">{t.recovery.text}</p>
          {!v.highIntentPositionToday && <p className="text-muted-foreground">Start is close: no hard position throws today.</p>}
        </CardContent>
      </Card>
      <Button className="min-h-11 w-full" onClick={() => setMoved((m) => (m ? 0 : 21))}>
        {moved ? "Put the game back" : "Game postponed three weeks"}
      </Button>
    </main>
  );
}
