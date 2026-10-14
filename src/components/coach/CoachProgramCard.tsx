/** The coach's own setup answers, shown on the Coach Dashboard with an Edit link back to setup. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Row = { org_name: string | null; program_name: string | null; seasons_run: number | null; athlete_count: number | null; age_groups: string[] | null; primary_disciplines: string[] | null; coaching_philosophy: string | null };

export function CoachProgramCard() {
  const { user } = useAuth();
  const [row, setRow] = useState<Row | null | undefined>(undefined);
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("coach_context").select("org_name, program_name, seasons_run, athlete_count, age_groups, primary_disciplines, coaching_philosophy")
      .eq("user_id", user.id).maybeSingle().then(({ data }) => setRow((data as Row) ?? null));
  }, [user?.id]);
  if (row === undefined) return null;
  const none = "Not entered";
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your program</h2>
        <Link to="/onboarding/coach" className="text-sm underline underline-offset-2">Edit</Link>
      </div>
      <p className="text-sm">Organization: {row?.org_name || none} · Team: {row?.program_name || none}</p>
      <p className="text-sm">Seasons run: {row?.seasons_run ?? none} · Athletes: {row?.athlete_count ?? none}</p>
      <div className="flex flex-wrap items-center gap-1 text-sm">Ages and levels: {row?.age_groups?.length ? row.age_groups.map((a) => <Badge key={a} variant="secondary">{a}</Badge>) : none}</div>
      <div className="flex flex-wrap items-center gap-1 text-sm">Focus: {row?.primary_disciplines?.length ? row.primary_disciplines.map((a) => <Badge key={a} variant="outline">{a}</Badge>) : none}</div>
      {row?.coaching_philosophy && <p className="text-sm text-muted-foreground">Philosophy: {row.coaching_philosophy}</p>}
    </Card>
  );
}
