/**
 * ReportView — the single renderer for every report snapshot.
 *
 * In-app view, print output and the public share page all render THIS
 * component, so a PDF can never drift from what the coach saw on screen.
 */
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StrikeZoneGrid, type Zone } from "@/components/games/StrikeZoneGrid";
import { cn } from "@/lib/utils";
import type { ReportSnapshot, ReportSection, StatLine } from "@/lib/games/reportEngine";

const toneClass: Record<string, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  watch: "text-amber-600 dark:text-amber-400",
  bad: "text-rose-600 dark:text-rose-400",
};

function Stat({ s, big }: { s: StatLine; big?: boolean }) {
  return (
    <div className="min-w-[7rem]">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
      <div className={cn(big ? "text-2xl" : "text-lg", "font-semibold", s.tone && toneClass[s.tone])}>
        {s.value}
      </div>
      {s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}
    </div>
  );
}

function SectionBlock({ section }: { section: ReportSection }) {
  const heatValues = section.heat
    ? (Object.fromEntries(
        Object.entries(section.heat.values).map(([k, v]) => [Number(k), v as number]),
      ) as Partial<Record<Zone, number>>)
    : undefined;
  const max = heatValues ? Math.max(...Object.values(heatValues).map((v) => v ?? 0), 1) : 1;
  const normalized = heatValues
    ? (Object.fromEntries(
        Object.entries(heatValues).map(([k, v]) => [Number(k), (v ?? 0) / max]),
      ) as Partial<Record<Zone, number>>)
    : undefined;
  const heatLabels = section.heat
    ? (Object.fromEntries(
        Object.entries(section.heat.labels).map(([k, v]) => [Number(k), v as string]),
      ) as Partial<Record<Zone, string>>)
    : undefined;

  return (
    <section className="space-y-3 break-inside-avoid">
      <div>
        <h3 className="text-base font-semibold">{section.title}</h3>
        {section.summary && <p className="text-sm text-muted-foreground">{section.summary}</p>}
      </div>

      {section.stats && section.stats.length > 0 && (
        <div className="flex flex-wrap gap-6">
          {section.stats.map((s, i) => (
            <Stat key={i} s={s} />
          ))}
        </div>
      )}

      {normalized && (
        <div className="max-w-[16rem] space-y-1">
          <StrikeZoneGrid heat={normalized} heatLabels={heatLabels} />
          {section.heat?.caption && (
            <p className="text-xs text-muted-foreground">{section.heat.caption}</p>
          )}
        </div>
      )}

      {section.table && section.table.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                {section.table.columns.map((c) => (
                  <th key={c} className="py-1.5 pr-3 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  {r.map((cell, j) => (
                    <td key={j} className="py-1.5 pr-3">
                      {String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section.bullets && section.bullets.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {section.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ReportView({ snapshot }: { snapshot: ReportSnapshot }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="uppercase">
            {snapshot.sport}
          </Badge>
          <Badge variant="outline">{snapshot.kind.replace(/_/g, " ")}</Badge>
        </div>
        <h1 className="text-2xl font-bold leading-tight">{snapshot.title}</h1>
        {snapshot.subtitle && <p className="text-sm text-muted-foreground">{snapshot.subtitle}</p>}
      </header>

      {snapshot.headline.length > 0 && (
        <Card className="flex flex-wrap gap-8 p-4">
          {snapshot.headline.map((s, i) => (
            <Stat key={i} s={s} big />
          ))}
        </Card>
      )}

      {snapshot.nextUp.length > 0 && (
        <Card className="space-y-2 border-primary/40 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Train next</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {snapshot.nextUp.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-8">
        {snapshot.sections.map((s) => (
          <div key={s.id} className="space-y-3">
            <Separator />
            <SectionBlock section={s} />
          </div>
        ))}
      </div>

      <footer className="pt-4 text-xs text-muted-foreground">
        {snapshot.footnote && <p>{snapshot.footnote}</p>}
        <p>
          Generated {new Date(snapshot.generatedAt).toLocaleString()} · Hammers Modality
        </p>
      </footer>
    </div>
  );
}
