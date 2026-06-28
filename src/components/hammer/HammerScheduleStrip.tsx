/**
 * HammerScheduleStrip — compact, action-grade season + game-day context line
 * that sits above the Hammer Daily Plan. Provides direct affordances to mark
 * in-season, update season dates, open calendar to add a game, and tell
 * Hammer about life/team changes via the dialogue card.
 *
 * Read-only projector — never authors organism truth.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CalendarPlus, MessageSquarePlus, Settings2 } from "lucide-react";
import { useGameDayContext } from "@/hooks/useGameDayContext";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { TellHammerDialog } from "@/components/hammer/TellHammerDialog";
import { SeasonScheduleImporterDialog } from "@/components/hammer/SeasonScheduleImporterDialog";

const PHASE_TONE: Record<string, string> = {
  preseason: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  in_season: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  post_season: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  off_season: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
};

export function HammerScheduleStrip() {
  const ctx = useGameDayContext();
  const { updateSeasonStatus } = useSeasonStatus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);

  if (ctx.loading) return null;

  const showMarkInSeason = ctx.seasonPhase !== "in_season" && ctx.gamesNext7d > 0;

  return (
    <>
      <Card className="border-border/60">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge
                variant="outline"
                className={`text-[10px] uppercase tracking-wide ${PHASE_TONE[ctx.seasonPhase] ?? ""}`}
              >
                {ctx.phaseLabel}
              </Badge>
              {ctx.isGameToday && (
                <Badge className="text-[10px] bg-rose-500 text-white">Game today</Badge>
              )}
              {!ctx.isGameToday && ctx.isGameTomorrow && (
                <Badge variant="outline" className="text-[10px]">Game tomorrow</Badge>
              )}
              {ctx.highDensity && (
                <Badge variant="outline" className="text-[10px]">
                  {ctx.consecutiveGameDays}-day stretch
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-foreground/90 leading-snug">{ctx.summaryLine}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {showMarkInSeason && (
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-[11px] gap-1"
                onClick={() => updateSeasonStatus({ season_status: "in_season" })}
              >
                Mark in-season
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1"
              onClick={() => setImporterOpen(true)}
            >
              <CalendarPlus className="h-3 w-3" />
              Add game
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1"
              onClick={() => setImporterOpen(true)}
            >
              <Settings2 className="h-3 w-3" />
              Season dates
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] gap-1"
              onClick={() => setDialogOpen(true)}
            >
              <MessageSquarePlus className="h-3 w-3" />
              Tell Hammer what changed
            </Button>
          </div>
        </CardContent>
      </Card>
      <TellHammerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <SeasonScheduleImporterDialog open={importerOpen} onOpenChange={setImporterOpen} />
    </>
  );
}
