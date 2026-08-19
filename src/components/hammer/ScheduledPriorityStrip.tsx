/**
 * ScheduledPriorityStrip — pinned at the very top of Hammers Today.
 *
 * Presentation only. Renders nothing unless a periodic item is genuinely due
 * per its existing cadence authority (see `useScheduledPriorityTasks`).
 */
import { useNavigate } from "react-router-dom";
import { ChevronRight, CalendarCheck } from "lucide-react";
import { useOpenedOnceToday } from "@/hooks/useOpenedOnceToday";
import { useScheduledPriorityTasks } from "@/hooks/hammer/useScheduledPriorityTasks";
import { cn } from "@/lib/utils";

export function ScheduledPriorityStrip() {
  const navigate = useNavigate();
  const { tasks, loading } = useScheduledPriorityTasks();
  const { shouldGlow, markOpened } = useOpenedOnceToday("scheduled-priority");

  if (loading || tasks.length === 0) return null;

  const go = (link: string) => {
    markOpened();
    navigate(link);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/30 bg-primary/5 p-2 sm:p-2.5",
        shouldGlow && "animate-pulse ring-2 ring-primary/40",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        <CalendarCheck className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Due today · {tasks.length}
        </span>
      </div>

      <div className="space-y-1">
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => go(task.link)}
              className="flex w-full items-center gap-2.5 rounded-md border border-border/60 bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{task.title}</div>
                <div className="truncate text-[11px] text-muted-foreground">{task.detail}</div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  task.overdue
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {task.overdue ? "Overdue" : task.cadence}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
