import { Link } from "react-router-dom";

interface Props {
  sourceEventIds: string[];
}

export function ForecastSourceStrip({ sourceEventIds }: Props) {
  if (sourceEventIds.length === 0) return null;
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Canonical source events ({sourceEventIds.length})
      </p>
      <div className="flex flex-wrap gap-1">
        {sourceEventIds.slice(0, 40).map((id) => (
          <Link
            key={id}
            to={`/replay/${id}`}
            className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:border-primary hover:text-foreground"
          >
            {id.slice(0, 8)}
          </Link>
        ))}
      </div>
    </div>
  );
}
