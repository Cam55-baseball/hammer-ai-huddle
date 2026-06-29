/**
 * ManageEventsDialog — list upcoming games + practices in the next 30 days
 * and let the athlete mark each one canceled, reschedule it to a new date,
 * or restore a previously canceled event.
 *
 * Writes go through `useEventStatusMutation`, which invalidates the schedule
 * window queries so Hammer's daily plan immediately reflects the change.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CalendarIcon, RotateCcw, Trophy, Dumbbell, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEventStatusMutation, type EventKind } from "@/hooks/useEventStatusMutation";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Row {
  id: string;
  kind: EventKind;
  date: string;
  title: string;
  subtitle?: string;
  status: string;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoOffset(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export function ManageEventsDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { setStatus, reschedule } = useEventStatusMutation();
  const [rescheduleTarget, setRescheduleTarget] = useState<Row | null>(null);

  const start = isoToday();
  const end = isoOffset(30);

  const query = useQuery({
    queryKey: ["manage-events", user?.id, start, end, open],
    enabled: !!user && open,
    staleTime: 15_000,
    queryFn: async () => {
      const [games, practices] = await Promise.all([
        (supabase as any)
          .from("gp_games")
          .select("id, game_date, opponent_team, game_type, status")
          .eq("user_id", user!.id)
          .gte("game_date", start)
          .lte("game_date", end)
          .order("game_date", { ascending: true }),
        (supabase as any)
          .from("scheduled_practice_sessions")
          .select("id, scheduled_date, title, session_type, status")
          .eq("user_id", user!.id)
          .gte("scheduled_date", start)
          .lte("scheduled_date", end)
          .order("scheduled_date", { ascending: true }),
      ]);
      const gameRows: Row[] = (games.data ?? []).map((g: any) => ({
        id: g.id,
        kind: "game",
        date: g.game_date,
        title: g.opponent_team ? `vs ${g.opponent_team}` : "Game",
        subtitle: g.game_type,
        status: g.status ?? "scheduled",
      }));
      const pracRows: Row[] = (practices.data ?? []).map((p: any) => ({
        id: p.id,
        kind: "practice",
        date: p.scheduled_date,
        title: p.title ?? "Practice",
        subtitle: p.session_type,
        status: p.status ?? "scheduled",
      }));
      return [...gameRows, ...pracRows].sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  const rows = query.data ?? [];
  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const list = map.get(r.date) ?? [];
      list.push(r);
      map.set(r.date, list);
    }
    return Array.from(map.entries());
  }, [rows]);

  const handleCancel = (row: Row) =>
    setStatus.mutate({ id: row.id, kind: row.kind, status: "canceled" });
  const handleRestore = (row: Row) =>
    setStatus.mutate({ id: row.id, kind: row.kind, status: "scheduled" });
  const handleReschedule = (row: Row, newDate: Date) => {
    reschedule.mutate(
      { id: row.id, kind: row.kind, newDate: format(newDate, "yyyy-MM-dd") },
      { onSuccess: () => setRescheduleTarget(null) },
    );
  };

  const isCanceled = (s: string) => s === "canceled" || s === "cancelled";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage upcoming events</DialogTitle>
          <DialogDescription>
            Cancel or reschedule games and practices in the next 30 days. Hammer's daily
            plan adjusts immediately — canceled events stop driving taper or game-day mode.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {query.isLoading && (
            <p className="text-sm text-muted-foreground">Loading events…</p>
          )}
          {!query.isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No games or practices on the books in the next 30 days.
            </p>
          )}
          {grouped.map(([date, items]) => (
            <div key={date} className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                {format(parseISO(date), "EEE, MMM d")}
              </p>
              <div className="space-y-1.5">
                {items.map((row) => {
                  const canceled = isCanceled(row.status);
                  return (
                    <div
                      key={`${row.kind}-${row.id}`}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md border border-border/60 p-2",
                        canceled && "opacity-60",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {row.kind === "game" ? (
                          <Trophy className="h-4 w-4 text-rose-500 shrink-0" />
                        ) : (
                          <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-sm font-medium truncate",
                              canceled && "line-through",
                            )}
                          >
                            {row.title}
                          </p>
                          {row.subtitle && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {row.subtitle}
                            </p>
                          )}
                        </div>
                        {canceled && (
                          <Badge variant="outline" className="text-[10px]">
                            Canceled
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canceled ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] gap-1"
                            onClick={() => handleRestore(row)}
                            disabled={setStatus.isPending}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </Button>
                        ) : (
                          <>
                            <Popover
                              open={rescheduleTarget?.id === row.id}
                              onOpenChange={(o) =>
                                setRescheduleTarget(o ? row : null)
                              }
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px] gap-1"
                                >
                                  <CalendarIcon className="h-3 w-3" />
                                  Reschedule
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="end"
                              >
                                <Calendar
                                  mode="single"
                                  selected={parseISO(row.date)}
                                  onSelect={(d) => d && handleReschedule(row, d)}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] gap-1 text-rose-600 hover:text-rose-700"
                              onClick={() => handleCancel(row)}
                              disabled={setStatus.isPending}
                            >
                              <XCircle className="h-3 w-3" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
