import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { buildAreaRows, type AreaVideo } from "@/lib/intelligence/areaRows";
import { isEarlyRead } from "@/lib/intelligence/howSure";
import { canSeeReportCard, videoGradesShown, VIDEO_GRADE_PLACEHOLDER } from "@/lib/reportCard/visibility";
import { InternalLabel } from "@/components/InternalLabel";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useReportCardTrend } from "@/hooks/useReportCardTrend";
import { areaGrade } from "@/lib/intelligence/areaGrade";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function PerformanceAreaRows() {
  const { user } = useAuth();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const showCard = canSeeReportCard({ isOwner, isAdmin });
  const { data: rows = [], isError } = useQuery({
    queryKey: ["perf-area-rows", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("videos")
        .select("module, created_at").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return buildAreaRows((data ?? []) as AreaVideo[]);
    },
  });
  if (isError) {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        We couldn't load your areas. Please try again later.
      </p>
    );
  }
  if (!rows.length) return null;
  return (
    <section className="space-y-2" aria-label="Your areas">
      <h3 className="text-sm font-semibold">Your areas</h3>
      {rows.map((r) => (
        <Card key={r.area} className="flex items-center justify-between p-3">
          <div>
            <p className="font-semibold">{r.area}</p>
            <p className="text-xs text-muted-foreground">
              Analyses: {r.count}{isEarlyRead(r.count) ? " · early read" : ""}
            </p>
            <p className="text-xs text-muted-foreground">Last analysis: {fmtDate(r.lastAt)}</p>
            {showCard ? <div>{!videoGradesShown() && <InternalLabel />}<AreaGradeLine area={r.area} /></div> : <p className="text-xs text-muted-foreground">Grade: {VIDEO_GRADE_PLACEHOLDER}</p>}
          </div>
          <Link to={`/analyze/${r.area.toLowerCase()}`} className="text-xs text-primary underline">{showCard ? "See report card" : "See analysis"}</Link>
        </Card>
      ))}
      <Link to="/vault" className="text-xs text-primary underline">See tests</Link>
    </section>
  );
}

function AreaGradeLine({ area }: { area: string }) {
  const { data, isLoading } = useReportCardTrend(area.toLowerCase(), 8);
  if (isLoading) return null;
  const latest = (data ?? []).find((e) => e.grade);
  if (!latest?.grade) return <p className="text-xs text-muted-foreground">Grade: Not yet measured</p>;
  const g = areaGrade(latest.grade.score);
  return (
    <p className="text-xs text-muted-foreground">
      Grade: {g.grade} ({g.band}) · from your {area.toLowerCase()} video, {fmtDate(latest.createdAt)}
    </p>
  );
}
