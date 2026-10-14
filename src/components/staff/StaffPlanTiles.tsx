import { Link } from "react-router-dom";
import { Building2, Check, ClipboardList, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Regular-size advertising tiles for the Coach and Organization plans — the same for every account. */
const TILES = [
  {
    key: "coach",
    icon: ClipboardList,
    name: "Hammers Coach",
    price: "$300",
    per: "per month",
    value: "Run your whole roster from one screen.",
    points: ["Unlimited video analyses", "Log games and practices", "Readiness and discipline views"],
    cta: "Start Hammers Coach",
  },
  {
    key: "organization",
    icon: Building2,
    name: "Hammers Organization",
    price: "$1,000",
    per: "per month · 5 coach seats",
    value: "Every coach, team and player in one view.",
    points: ["Hammers Coach for 5 coaches", "Facility dashboard and teams", "Extra coach seats $150/month"],
    cta: "Start Hammers Organization",
  },
] as const;

export function StaffPlanTiles() {
  return (
    <section aria-label="Coach and Organization plans" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {TILES.map((t) => (
        <Card key={t.key} className="flex flex-col border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/15 p-2"><t.icon className="h-5 w-5 text-primary" /></div>
              <h3 className="text-base font-bold leading-tight">{t.name}</h3>
            </div>
            <Badge variant="secondary">Elite</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t.value}</p>
          <p className="mt-2"><span className="text-xs text-muted-foreground">Price: </span><span className="text-xl font-extrabold text-primary">{t.price}</span> <span className="text-xs text-muted-foreground">{t.per}</span></p>
          <ul className="mt-2 space-y-1">
            {t.points.map((p) => (
              <li key={p} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{p}</li>
            ))}
          </ul>
          <Button asChild size="sm" className="mt-3 min-h-11 w-full font-semibold">
            <Link to="/staff-plans">{t.cta}<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </Card>
      ))}
    </section>
  );
}
