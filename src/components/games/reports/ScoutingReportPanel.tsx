/**
 * ScoutingReportPanel — opponent scouting report built from dossiers,
 * opponent hitters and every logged pitch/at-bat against that team.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer, Save, Link2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { gp } from "@/lib/games/ledger";
import { ReportView } from "@/components/games/reports/ReportView";
import { useScoutingReport, useReportActions, shareUrl } from "@/hooks/useGameReport";

export function ScoutingReportPanel() {
  const { user } = useAuth();
  const [opponent, setOpponent] = useState<string | undefined>();

  const opponents = useQuery({
    queryKey: ["gp-opponents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await gp("gp_games")
        .select("opponent_team,sport,game_date")
        .eq("user_id", user!.id)
        .order("game_date", { ascending: false })
        .limit(300);
      if (error) throw error;
      const seen = new Map<string, string>();
      for (const g of (data ?? []) as any[]) {
        if (g.opponent_team && !seen.has(g.opponent_team)) seen.set(g.opponent_team, g.sport);
      }
      return Array.from(seen, ([name, sport]) => ({ name, sport }));
    },
  });

  const report = useScoutingReport(
    opponent,
    opponents.data?.find((o) => o.name === opponent)?.sport,
  );
  const { save, share } = useReportActions();

  const saveAndShare = async () => {
    if (!report.data) return;
    try {
      const saved = await save.mutateAsync({ snapshot: report.data, gameId: null });
      const shared = await share.mutateAsync({ reportId: saved.id, days: 30 });
      await navigator.clipboard.writeText(shareUrl(shared.share_token!)).catch(() => {});
      toast.success("Scouting report saved — share link copied");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't share the report");
    }
  };

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Select value={opponent} onValueChange={setOpponent}>
          <SelectTrigger className="h-9 w-[240px]">
            <SelectValue placeholder="Pick an opponent" />
          </SelectTrigger>
          <SelectContent>
            {(opponents.data ?? []).map((o) => (
              <SelectItem key={o.name} value={o.name}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          disabled={!report.data}
          onClick={() => window.print()}
        >
          <Printer className="mr-1 h-4 w-4" /> Print / PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!report.data || save.isPending}
          onClick={() =>
            report.data &&
            save.mutateAsync({ snapshot: report.data, gameId: null }).then(
              () => toast.success("Scouting report saved"),
              (e) => toast.error(e?.message ?? "Couldn't save"),
            )
          }
        >
          <Save className="mr-1 h-4 w-4" /> Save
        </Button>
        <Button size="sm" disabled={!report.data || share.isPending} onClick={saveAndShare}>
          <Link2 className="mr-1 h-4 w-4" /> Share
        </Button>
      </Card>

      {!opponent && (
        <p className="text-sm text-muted-foreground">
          Pick a team you've played to build a scouting report from your dossiers and every pitch
          you've logged against them.
        </p>
      )}
      {opponent && report.isLoading && (
        <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Building report…
        </Card>
      )}
      {report.error && (
        <Card className="p-4 text-sm text-destructive">
          {(report.error as any)?.message ?? "Couldn't build that report."}
        </Card>
      )}
      {report.data && <ReportView snapshot={report.data} />}
    </div>
  );
}
