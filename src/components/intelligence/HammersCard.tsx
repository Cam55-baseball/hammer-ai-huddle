import { Card } from "@/components/ui/card";
import { HOW_SURE_DOTS, HOW_SURE_LABEL, isEarlyRead, type HowSure } from "@/lib/intelligence/howSure";

export function HowSureDots({ level }: { level: HowSure }) {
  const filled = HOW_SURE_DOTS[level];
  return (
    <span className="inline-flex items-center gap-2" aria-label={`How sure: ${HOW_SURE_LABEL[level]}`}>
      <span className="inline-flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full border border-primary ${i < filled ? "bg-primary" : "bg-transparent"}`}
          />
        ))}
      </span>
      <span className="font-semibold text-foreground">{HOW_SURE_LABEL[level]}</span>
    </span>
  );
}

export interface HammersCardProps {
  title?: string;
  weSee: string;
  because?: string;
  howSure: HowSure;
  samples?: number;
  doThis?: string;
  checkBack?: string;
}

/** The one card every Hammers insight uses: We see / Because / How sure / Do this / Check back. */
export function HammersCard({ title, weSee, because, howSure, samples, doThis, checkBack }: HammersCardProps) {
  const thin = howSure === "need_more_data";
  const early = !thin && samples !== undefined && isEarlyRead(samples);
  const rows: [string, React.ReactNode][] = [
    ["We see", weSee],
    ["Because", thin ? "Not enough data yet. We won't guess." : because ?? "Not entered"],
    [
      "How sure",
      <span className="flex flex-wrap items-center gap-2">
        <HowSureDots level={howSure} />
        {early && <span className="text-muted-foreground">Early read ({samples})</span>}
      </span>,
    ],
    ["Do this", doThis ?? (thin ? "Keep logging so we can learn more." : "Not entered")],
    ["Check back", checkBack ?? "Not entered"],
  ];
  return (
    <Card className="p-4 space-y-2" data-testid="hammers-card">
      {title && <h3 className="text-lg font-bold text-foreground">{title}</h3>}
      <dl className="space-y-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt>
            <dd className="text-base text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
