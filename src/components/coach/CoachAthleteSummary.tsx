import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Glance, todayStatus, weekCompletion, topAlert, latestTest, headCoach } from "@/lib/coach/glance";
import {MasteryIdentityPanel} from '@/components/intelligence/MasteryIdentityPanel';

// Plan v3.1 Phase 5 — coach summary card. Every value is labeled and every
// missing value says so plainly ("Not shared" / "Not started"); nothing is
// fabricated. Sport comes from athlete_context (profiles has no sport column).

function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export function CoachAthleteSummary({
  athleteId,
  lastActivityAt,
}: {
  athleteId: string;
  lastActivityAt: string | null;
}) {
  const { data: glance, isError: glanceError } = useQuery({
    queryKey: ["coach-athlete-glance", athleteId],
    enabled: !!athleteId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_athlete_glance", { _athlete: athleteId });
      if (error) throw error;
      return data as unknown as Glance;
    },
  });
  // Name/age/position/team/sport come through the access-checked glance call
  // (coaches cannot read the profile row directly).
  const pr = glance?.profile ?? null;
  const profile = pr ? { full_name: pr.full_name, position: pr.position, team_affiliation: pr.team, hammers_today_started_at: pr.plan_started_at } : null;
  const ctx = pr ? { sport_primary: pr.sport } : null;
  const fd = (iso: string) => fmtDate(iso) ?? iso;
  const gv = (f: () => string) => (glanceError ? "Not available" : glance ? f() : "Loading…");

  const age = typeof pr?.age === "number" && pr.age >= 0 && pr.age < 120 ? pr.age : null;
  const planStart = fmtDate(profile?.hammers_today_started_at);
  const lastActivity = fmtDate(lastActivityAt);

  return (
    <div className="space-y-4"><Card data-tour="coach-summary">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{profile?.full_name?.trim() || "Athlete"}</span>
          {ctx?.sport_primary && (
            <Badge variant="outline" className="text-[10px] capitalize">
              {ctx.sport_primary}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        <Row label="Today" value={gv(() => todayStatus(glance))} />
        <Row label="7-day completion" value={gv(() => weekCompletion(glance))} />
        <Row label="Top alert" value={gv(() => topAlert(glance, fd))} />
        <Row label="Newest test" value={gv(() => latestTest(glance, fd))} />
        <Row label="Head coach" value={gv(() => headCoach(glance))} />
        <Row label="Age" value={age !== null ? `${age} years old` : "Not shared"} />
        <Row label="Sport" value={ctx?.sport_primary ? ctx.sport_primary : "Not shared"} />
        <Row label="Position" value={profile?.position?.trim() || "Not shared"} />
        <Row label="Team" value={profile?.team_affiliation?.trim() || "Not shared"} />
        <Row
          label="Training plan"
          value={planStart ? `Started ${planStart}` : "Not started"}
        />
        <Row
          label="Last activity"
          value={lastActivity ? lastActivity : "No activity in the last 30 days"}
        />
      </CardContent>
    </Card>{(ctx?.sport_primary==='baseball'||ctx?.sport_primary==='softball')&&<MasteryIdentityPanel sport={ctx.sport_primary} athleteId={athleteId}/>}</div>
  );
}
