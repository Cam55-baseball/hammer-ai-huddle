import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { timingStudy, type TimingStudyRole } from "@/lib/hammer/timingStudy";
export function TimingStudyMoments({ sport, position, flags = [], goals = [], roles }: { sport: "baseball" | "softball"; position: string | null; flags?: string[]; goals?: string[]; roles: TimingStudyRole[] }) {
  const navigate = useNavigate();
  const applicable = [...new Set<TimingStudyRole>([...(position === "P" || /pitch/i.test(position ?? "") ? ["pitcher" as const] : position ? ["defender" as const] : []), ...roles])];
  if (!applicable.length) return null;
  return <section className="space-y-3 border-b border-border py-3" aria-label="Royal timing study">
    <h3 className="text-sm font-semibold">Royal timing study</h3>
    {applicable.map(role => {
      const study = timingStudy({ role, sport, flags, goals });
      return <div key={role} className="space-y-1"><p className="text-xs font-semibold capitalize">{role}</p><p className="text-xs text-muted-foreground">{study.reason}</p><ul className="list-disc space-y-1 pl-4 text-sm">{study.examples.map(example => <li key={example}>{example}</li>)}</ul></div>;
    })}
    <Button size="sm" variant="outline" onClick={() => navigate("/royal-timing")}>Open Royal timing</Button>
  </section>;
}