import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const { data: profile } = useQuery({
    queryKey: ["coach-athlete-summary", athleteId],
    enabled: !!athleteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, date_of_birth, position, team_affiliation, hammers_today_started_at")
        .eq("id", athleteId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: ctx } = useQuery({
    queryKey: ["coach-athlete-summary-sport", athleteId],
    enabled: !!athleteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_context")
        .select("sport_primary")
        .eq("user_id", athleteId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const age = ageFromDob(profile?.date_of_birth);
  const planStart = fmtDate(profile?.hammers_today_started_at);
  const lastActivity = fmtDate(lastActivityAt);

  return (
    <Card data-tour="coach-summary">
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
    </Card>
  );
}
