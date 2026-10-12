import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  alertLine, checkinLine, headline, lastActiveLine, playerName, testsLine, todayLine, weekLine,
  type FacilityBoardRow,
} from "@/lib/org/facilityBoard";

export function FacilityBoard({ orgId }: { orgId: string }) {
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [coachFilter, setCoachFilter] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["org-facility-board", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("org_facility_board", { _org: orgId });
      if (error) throw error;
      return (data ?? []) as FacilityBoardRow[];
    },
  });

  const rows = useMemo(() => data ?? [], [data]);
  const teams = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => { if (r.team_id && r.team_name) m.set(r.team_id, r.team_name); });
    return [...m.entries()];
  }, [rows]);
  const coaches = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => { if (r.coach_id && r.coach_name) m.set(r.coach_id, r.coach_name); });
    return [...m.entries()];
  }, [rows]);

  const filtered = rows.filter(
    (r) =>
      (teamFilter === "all" || r.team_id === teamFilter) &&
      (coachFilter === "all" || r.coach_id === coachFilter),
  );
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Players at a glance</CardTitle>
        <p className="text-sm text-muted-foreground">
          One short line per player. Tap a name for details.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-40" aria-label="Filter by team"><SelectValue placeholder="All teams" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={coachFilter} onValueChange={setCoachFilter}>
            <SelectTrigger className="w-40" aria-label="Filter by coach"><SelectValue placeholder="All coaches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All coaches</SelectItem>
              {coaches.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No players to show.</p>
        )}
        <ul className="divide-y">
          {filtered.map((r) => {
            const isOpen = open === r.athlete_id;
            return (
              <li key={r.athlete_id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 py-2 text-left"
                  onClick={() => setOpen(isOpen ? null : r.athlete_id)}
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium">{playerName(r)}</span>
                    {r.team_name && <span className="text-xs text-muted-foreground">· {r.team_name}</span>}
                  </span>
                  <span className="text-sm text-muted-foreground">{headline(r, todayISO)}</span>
                </button>
                {isOpen && (
                  <div className="space-y-1 pb-3 pl-6 text-sm">
                    <p>{todayLine(r)}</p>
                    <p>{lastActiveLine(r)}</p>
                    <p>{weekLine(r)}</p>
                    <p>{checkinLine(r as any)}</p>
                    <p>{testsLine(r)}</p>
                    <p>{alertLine(r)}</p>
                    {r.coach_name && <p>Coach: {r.coach_name}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
