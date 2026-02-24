import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getGradeLabel } from "@/lib/gradeLabel";
import type { MPIRankingData } from "@/pages/Rankings";

interface RankingsTableProps {
  rankings: MPIRankingData[];
  loading: boolean;
  currentUserId?: string;
}

export function RankingsTable({ rankings, loading, currentUserId }: RankingsTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t("rankings.rank")}</TableHead>
            <TableHead>{t("rankings.athlete")}</TableHead>
            <TableHead>{t("rankings.mpiScore")}</TableHead>
            <TableHead className="text-right">{t("rankings.percentile")}</TableHead>
            <TableHead className="text-right">{t("rankings.trend")}</TableHead>
            <TableHead>{t("rankings.sport")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t("rankings.noRankings")}
              </TableCell>
            </TableRow>
          ) : (
            rankings.map((ranking, index) => {
              const isCurrentUser = ranking.user_id === currentUserId;
              const rank = ranking.global_rank ?? index + 1;
              const score = ranking.adjusted_global_score ?? 0;
              const TrendIcon = ranking.trend_direction === "rising" ? TrendingUp : ranking.trend_direction === "dropping" ? TrendingDown : Minus;
              const trendColor = ranking.trend_direction === "rising" ? "text-green-500" : ranking.trend_direction === "dropping" ? "text-red-500" : "text-muted-foreground";

              return (
                <TableRow
                  key={ranking.user_id}
                  className={isCurrentUser ? "bg-accent/50" : ""}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {rank <= 3 && (
                        <Trophy
                          className={`h-4 w-4 ${
                            rank === 1
                              ? "text-yellow-500"
                              : rank === 2
                              ? "text-gray-400"
                              : "text-orange-600"
                          }`}
                        />
                      )}
                      #{rank}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {ranking.full_name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-primary">({t("rankings.you")})</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-bold">{Math.round(score)}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{getGradeLabel(score)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {ranking.global_percentile != null
                      ? `${Math.round(ranking.global_percentile)}th`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                      {ranking.trend_delta_30d != null && (
                        <span className={`text-xs ${trendColor}`}>
                          {ranking.trend_delta_30d > 0 ? "+" : ""}
                          {ranking.trend_delta_30d.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border",
                      ranking.sport === "softball"
                        ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                        : "bg-blue-500/15 text-blue-700 border-blue-500/30"
                    )}>
                      {ranking.sport === "softball" ? "🥎" : "⚾"} {ranking.sport === "softball" ? "Softball" : "Baseball"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
