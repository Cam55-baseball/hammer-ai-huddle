interface SplitStatLineProps {
  label: string;
  composite: number;
  sessions: number;
  executionAvg?: number;
}

export function SplitStatLine({ label, composite, sessions, executionAvg }: SplitStatLineProps) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-muted-foreground tabular-nums">
        {composite} comp / {sessions} sessions{executionAvg != null ? ` / ${executionAvg} avg` : ''}
      </span>
    </div>
  );
}
