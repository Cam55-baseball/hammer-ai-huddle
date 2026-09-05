/**
 * Root pattern callout.
 *
 * When the same underlying movement pattern shows up in more than one skill,
 * the athlete is told once, loudly, instead of three separate small things.
 * Nothing is shown unless persisted fault findings support it.
 */
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, CheckCircle2 } from "lucide-react";
import { useCrossDomainFaults } from "@/hooks/useCrossDomainFaults";
import { domainListSentence } from "@/lib/analysis/crossDomainFaults";

export function RootPatternCallout({ limit = 1 }: { limit?: number }) {
  const { data: groups = [] } = useCrossDomainFaults();
  const cross = groups.filter((g) => g.crossDomain).slice(0, limit);
  if (cross.length === 0) return null;

  return (
    <div className="space-y-3">
      {cross.map((g) => {
        const domains = g.domains.map((d) => d.domain);
        return (
          <Card
            key={g.pattern.key}
            className="border-2 border-primary/40 bg-primary/5 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0 rounded-full bg-primary/15 p-2">
                {g.resolvedEverywhere ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Link2 className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  One problem, {g.domains.length} parts of your game
                </p>
                <h3 className="text-base font-bold leading-snug">{g.pattern.label}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{g.pattern.plain}</p>

                <div className="flex flex-wrap gap-1.5">
                  {g.domains.map((d) => (
                    <Badge
                      key={d.domain}
                      variant={d.clearedInLatest ? "secondary" : "destructive"}
                      className="text-[10px] capitalize"
                    >
                      {d.domain}
                      {d.clearedInLatest ? " — clear last time" : ""}
                    </Badge>
                  ))}
                </div>

                <ul className="space-y-1 text-xs text-muted-foreground">
                  {g.domains.map((d) =>
                    d.says ? (
                      <li key={d.domain}>
                        <span className="font-medium capitalize text-foreground">{d.domain}: </span>
                        {d.says}
                      </li>
                    ) : null,
                  )}
                </ul>

                {g.resolvedEverywhere ? (
                  <p className="rounded-md bg-background/70 px-3 py-2 text-xs font-medium">
                    Your latest {domainListSentence(domains)} clips no longer show it. That is the
                    proof the diagnosis was right — keep the work in.
                  </p>
                ) : (
                  <p className="rounded-md bg-background/70 px-3 py-2 text-xs font-medium">
                    This showed up in your {domainListSentence(domains)}. Fixing it once helps all
                    of them, so it comes first in your work.
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
