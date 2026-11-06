import { useEffect, useRef } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Owner Nov 6 r4 (G15): one-line labels in a horizontally scrollable strip at phone width. */
export const COACH_ATHLETE_TABS: { value: string; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "development", label: "Development" },
  { value: "week", label: "Week calendar" },
  { value: "discipline", label: "Discipline" },
  { value: "training", label: "Training" },
  { value: "messages", label: "Messages" },
  { value: "activity", label: "Activity" },
  { value: "tests", label: "Tests" },
  { value: "trends", label: "Trends" },
  { value: "load", label: "Body load" },
  { value: "games", label: "Game stats" },
  { value: "checkins", label: "Check-ins & readiness" },
  { value: "readiness", label: "Readiness & pain" },
  { value: "reports", label: "Reports" },
  { value: "grades", label: "Grades" },
  { value: "recap", label: "Six-week recap" },
  { value: "notes", label: "Notes" },
];

export const TAB_STRIP_CLASS = "relative flex h-auto w-full justify-start gap-1 overflow-x-auto overscroll-x-contain p-1 snap-x [scrollbar-width:thin]";
export const TAB_TRIGGER_CLASS = "shrink-0 snap-start whitespace-nowrap px-3";

/** Scroll only the strip sideways so the active tab is fully visible (never the page). */
export function keepActiveInView(strip: HTMLElement | null) {
  const el = strip?.querySelector<HTMLElement>('[data-state="active"]');
  if (!strip || !el) return;
  const left = el.offsetLeft;
  if (left < strip.scrollLeft) strip.scrollLeft = Math.max(0, left - 4);
  else if (left + el.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = left + el.offsetWidth - strip.clientWidth + 4;
}

export function CoachAthleteTabStrip({ value }: { value?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => keepActiveInView(ref.current));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <TabsList ref={ref} aria-label="Player sections" className={TAB_STRIP_CLASS} data-coach-tab-strip>
      {COACH_ATHLETE_TABS.map((t) => (
        <TabsTrigger key={t.value} value={t.value} className={TAB_TRIGGER_CLASS}>{t.label}</TabsTrigger>
      ))}
    </TabsList>
  );
}
