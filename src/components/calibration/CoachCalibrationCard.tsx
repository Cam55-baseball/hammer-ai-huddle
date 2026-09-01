import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sprout, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useCoachCalibration } from "@/hooks/useCalibration";
import { CalibrationEmptyState } from "./CalibrationEmptyState";

/**
 * Coach development record — own profile only.
 *
 * For the coach's own roster (MPI assignment, shared organization, or accepted
 * linked follow), compares each player's first and most recent overall grade
 * recorded *after* the coaching relationship began. No estimation: players with
 * fewer than two graded points are excluded from the delta entirely.
 */
export function CoachCalibrationCard() {
  const { data, isLoading, error } = useCoachCalibration();

  const withDelta = data?.players_with_delta ?? 0;
  const avg = data?.avg_delta ?? null;

  const DeltaIcon = avg == null ? Minus : avg > 0 ? ArrowUpRight : avg < 0 ? ArrowDownRight : Minus;
  const deltaClass =
    avg == null
      ? "text-muted-foreground"
      : avg > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : avg < 0
          ? "text-destructive"
          : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sprout className="h-5 w-5 text-primary" />
          Your development record
        </CardTitle>
        <CardDescription>
          How the players on your roster have graded out since they started working with you.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your roster history…
          </div>
        ) : error ? (
          <CalibrationEmptyState
            headline="Development record unavailable"
            detail="We couldn't read your roster history just now. Try again in a moment."
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Players coached</p>
                <p className="text-2xl font-semibold tabular-nums">{data?.roster_size ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">
                  {withDelta} with two or more grades
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Avg. grade change</p>
                <p className={`flex items-center gap-1 text-2xl font-semibold tabular-nums ${deltaClass}`}>
                  <DeltaIcon className="h-5 w-5" />
                  {avg != null ? `${avg > 0 ? "+" : ""}${avg.toFixed(1)}` : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">points on the 20-80 scale</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Direction split</p>
                <p className="text-sm font-semibold tabular-nums">
                  <span className="text-emerald-600 dark:text-emerald-400">{data?.improved ?? 0} up</span>
                  {" · "}
                  <span className="text-muted-foreground">{data?.flat ?? 0} flat</span>
                  {" · "}
                  <span className="text-destructive">{data?.declined ?? 0} down</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  best gain {data?.best_delta != null ? `+${data.best_delta.toFixed(1)}` : "—"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Player by player</p>
              {withDelta === 0 ? (
                <CalibrationEmptyState
                  headline="No graded progression yet"
                  detail="A player needs at least two graded evaluations recorded after they joined your roster before we can show a change. Nothing is inferred from a single grade."
                />
              ) : (
                <div className="divide-y rounded-lg border">
                  {(data?.players ?? []).map((p) => {
                    const up = p.delta > 0;
                    const flat = p.delta === 0;
                    return (
                      <div key={p.athlete_id} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            Player {p.athlete_id.slice(0, 8)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.first_overall.toFixed(1)} → {p.last_overall.toFixed(1)} ·{" "}
                            {p.grade_count} grades since{" "}
                            {new Date(p.coached_since).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-sm font-semibold tabular-nums ${
                            flat
                              ? "text-muted-foreground"
                              : up
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-destructive"
                          }`}
                        >
                          {up ? "+" : ""}
                          {p.delta.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">After a full season with you</p>
              {(data?.full_season_players ?? 0) === 0 ? (
                <CalibrationEmptyState
                  headline="No full-season players yet"
                  detail="Once a player has been on your roster for at least 180 days, we'll track whether they went on to match a recruiting standard."
                />
              ) : (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-2xl font-semibold tabular-nums">
                    {data!.full_season_with_success}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      of {data!.full_season_players}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    full-season players later matched a recruiting standard
                  </p>
                </div>
              )}
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                <strong className="font-medium text-foreground">Definitions:</strong> a full season is
                180+ days on your roster. The success marker is matching a published college or
                organization recruiting standard after that relationship started — the only
                externally-set, timestamped outcome the system records today. This is early, thin
                data: treat it as a record of what happened, not proof of cause.
              </p>
            </div>

            <Badge variant="outline" className="text-[11px]">
              Visible only to you
            </Badge>
          </>
        )}
      </CardContent>
    </Card>
  );
}
