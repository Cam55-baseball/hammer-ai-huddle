import { Link } from "react-router-dom";
import { Building2, Check, ClipboardList, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Dashboard tiles for the Coach and Organization plans. Prominent for staff, a quiet pair for players. */
const TILES = [
  {
    key: "coach",
    icon: ClipboardList,
    name: "Hammers Coach",
    price: "$300",
    per: "per month",
    value: "Run your whole roster from one screen.",
    points: ["Unlimited video analyses, baseball and softball", "Log games and practices for your players", "Readiness, discipline and development views", "Guest mode for players without an account"],
    cta: "Start Hammers Coach",
  },
  {
    key: "organization",
    icon: Building2,
    name: "Hammers Organization",
    price: "$1,000",
    per: "per month · 5 coach seats",
    value: "Every coach, team and player in one facility view.",
    points: ["Everything in Hammers Coach for 5 coaches", "Facility dashboard, teams and comparisons", "Extra coach seats $150 per month", "Organization-wide summaries"],
    cta: "Start Hammers Organization",
  },
] as const;

export function StaffPlanTiles({ variant }: { variant: "prominent" | "subtle" }) {
  if (variant === "subtle") {
    return (
      <section aria-label="For your coach or facility" className="space-y-2 pt-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">For your coach or facility</p>
        <div className="grid grid-cols-2 gap-2">
          {TILES.map((t) => (
            <Link key={t.key} to="/staff-plans" className="rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors">
              <t.icon className="h-4 w-4 text-primary mb-1" />
              <p className="text-sm font-semibold leading-tight">{t.name}</p>
              <p className="text-xs text-muted-foreground">Price: {t.price}/month</p>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section aria-label="Coach and Organization plans" className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      {TILES.map((t) => (
        <Card key={t.key} className="relative overflow-hidden border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-card to-accent/10 p-5 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="rounded-full bg-primary/15 p-3"><t.icon className="h-7 w-7 text-primary" /></div>
            <Badge variant="secondary">Elite</Badge>
          </div>
          <h3 className="mt-3 text-xl font-bold">{t.name}</h3>
          <p className="text-sm text-muted-foreground">{t.value}</p>
          <p className="mt-3"><span className="text-3xl font-extrabold text-primary">{t.price}</span> <span className="text-sm text-muted-foreground">{t.per}</span></p>
          <ul className="mt-3 space-y-1.5">
            {t.points.map((p) => (
              <li key={p} className="flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />{p}</li>
            ))}
          </ul>
          <Button asChild className="mt-4 w-full font-semibold shadow-md">
            <Link to="/staff-plans">{t.cta}<ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
        </Card>
      ))}
    </section>
  );
}
