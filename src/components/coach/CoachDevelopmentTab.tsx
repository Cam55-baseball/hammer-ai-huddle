import { MeaningTitle } from "@/components/progress/SectionMeaning";
import { useMemo } from "react";
import { videoGradesShown, VIDEO_GRADE_PLACEHOLDER } from "@/lib/reportCard/visibility";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import {
  buildCategoryCards,
  buildConnections,
  buildTakeaways,
  strengthsAndWeaknesses,
  dateOnly,
  type DevReport,
  type DevFinding,
} from "@/lib/coach/development";

interface Payload {
  reports: DevReport[];
  findings: DevFinding[];
}

function TrendIcon({ t }: { t: "up" | "down" | "flat" | "unknown" }) {
  if (t === "up") return <TrendingUp className="h-4 w-4 text-green-600" aria-label="going up" />;
  if (t === "down") return <TrendingDown className="h-4 w-4 text-red-600" aria-label="going down" />;
  if (t === "flat") return <Minus className="h-4 w-4 text-muted-foreground" aria-label="steady" />;
  return <HelpCircle className="h-4 w-4 text-muted-foreground" aria-label="not enough data" />;
}

const statusVariant = (s: string) =>
  s === "Recurring" ? "destructive" : s === "New" ? "secondary" : "outline";

export function CoachDevelopmentTab({ athleteId }: { athleteId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["coach-athlete-development", athleteId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("coach_athlete_development", { _athlete: athleteId });
      if (error) throw error;
      return data as Payload;
    },
  });

  const cards = useMemo(() => (data ? buildCategoryCards(data.reports ?? [], data.findings ?? []) : []), [data]);
  const connections = useMemo(() => (data ? buildConnections(data.reports ?? [], data.findings ?? []) : []), [data]);
  const takeaways = useMemo(() => (data ? buildTakeaways(data.reports ?? [], data.findings ?? []) : []), [data]);
  const sw = useMemo(
    () => (data ? strengthsAndWeaknesses(data.reports ?? []) : { strengths: [], weaknesses: [], note: null }),
    [data],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">Could not load the development view.</p>;
  if (!data || data.reports.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle><MeaningTitle title="Development" use="Read it before a session so you know what they're working on.">A summary of this player's saved video analyses, newest first.</MeaningTitle></CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No analysis reports yet — this view fills in once the player has video analysis reports.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle><MeaningTitle title="Takeaways" use="Pick one takeaway and build your next lesson around it.">The 1–3 most useful points from their recent reports, each with its proof.</MeaningTitle></CardTitle>
          <p className="text-sm text-muted-foreground">The 1–3 most useful things to know, each with its evidence.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {takeaways.map((t, i) => (
            <div key={i} className="rounded-md border p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{t.text}</p>
                <Badge variant="outline">Confidence: {t.confidence}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{t.evidence}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><MeaningTitle title="Development report card" use="Look for areas with few reports and ask for a new clip there.">Each skill area from their written video reports. Written reports are not camera measurements.</MeaningTitle></CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {cards.map((c) => (
            <div key={c.category} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <TrendIcon t={c.trend} />
                <p className="text-sm font-medium capitalize">{c.category}</p>
                <span className="text-xs text-muted-foreground">
                  {c.reports.length} recent report{c.reports.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-1">
                {c.reports.map((r) => (
                  <p key={r.id} className="text-xs text-muted-foreground">
                    {dateOnly(r.date)} · {!videoGradesShown() ? `Grade: ${VIDEO_GRADE_PLACEHOLDER}` : r.efficiency_score != null ? `Efficiency score: ${Math.round(r.efficiency_score)}` : "No score"} · Source: video analysis
                  </p>
                ))}
              </div>
              {c.issues.length > 0 && (
                <div className="space-y-1 pt-1">
                  {c.issues.map((i) => (
                    <div key={i.fault_key} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium capitalize">{i.fault_key.replace(/[_-]+/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          Seen {i.times_seen} of last {i.reports_checked} reports · last {i.last_seen.slice(0, 10)}
                          {i.evidence ? ` · ${i.evidence}` : ""}
                        </p>
                      </div>
                      <Badge variant={statusVariant(i.status) as any}>{i.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {c.issues.length === 0 && (
                <p className="text-xs text-muted-foreground">No open issues in the recent reports.</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><MeaningTitle title="Strengths & weaknesses" use="Keep the strength, and give one drill for the weakest area.">Areas that stand out compared with the player's own other areas, not other players.</MeaningTitle></CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {sw.strengths.length === 0 && sw.weaknesses.length === 0 && (
            <p className="text-sm text-muted-foreground">{sw.note}</p>
          )}
          {sw.strengths.map((s, i) => (
            <div key={`s${i}`} className="rounded-md border p-3">
              <p className="text-sm font-medium">{s.text}</p>
              <p className="text-xs text-muted-foreground">{s.evidence}</p>
            </div>
          ))}
          {sw.weaknesses.map((w, i) => (
            <div key={`w${i}`} className="rounded-md border p-3">
              <p className="text-sm font-medium">{w.text}</p>
              <p className="text-xs text-muted-foreground">{w.evidence}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><MeaningTitle title="Connections" use="Use a Pattern to plan drills. Treat a Hunch as something to watch on the next clip.">Links only show when the same thing showed up in at least 3 reports. A link never proves cause.</MeaningTitle></CardTitle>
          <p className="text-sm text-muted-foreground">
            Each connection is labeled by how strong the evidence is. A connection never means one thing caused another.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {connections.map((c, i) => (
            <div key={i} className="rounded-md border p-3">
              <Badge variant="outline" className="mb-1">{c.label}</Badge>
              <p className="text-sm">{c.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
