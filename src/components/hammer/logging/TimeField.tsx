/** Segmented time entry (s · mm:ss · h:mm:ss · ss.hh). Value is seconds as a string. */
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatTime, fromSegments, toSegments, type TimeKind } from "@/lib/logging/timeEntry";

const SEPARATOR: Record<TimeKind, string[]> = { seconds: [], mmss: [":"], hmmss: [":", ":"], sshh: ["."] };
const SEG_LABEL: Record<TimeKind, string[]> = { seconds: ["seconds"], mmss: ["minutes", "seconds"], hmmss: ["hours", "minutes", "seconds"], sshh: ["seconds", "hundredths"] };
const UNIT: Record<TimeKind, string> = { seconds: "s", mmss: "", hmmss: "", sshh: "s" };

export function TimeField({ kind, value, target, label, onChange, onBlur }: {
  kind: TimeKind; value: string; target?: number | null; label: string;
  onChange: (seconds: string) => void; onBlur?: () => void;
}) {
  const num = value === "" ? null : Number(value);
  const [segs, setSegs] = useState(() => toSegments(kind, num));
  useEffect(() => {
    const cur = fromSegments(kind, segs);
    if ((cur ?? null) !== (num ?? null)) setSegs(toSegments(kind, num));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, kind]);
  const guide = toSegments(kind, target ?? null);
  const set = (i: number, raw: string) => {
    const max = kind === "seconds" ? 4 : i === 0 && kind !== "sshh" ? 3 : 2;
    const next = segs.map((s, n) => n === i ? raw.replace(/\D/g, "").slice(0, max) : s);
    setSegs(next);
    const secs = fromSegments(kind, next);
    onChange(secs == null ? "" : String(secs));
  };
  return <div className="flex items-center gap-0.5" data-time-field={kind} role="group" aria-label={label}>
    {segs.map((s, i) => <span key={i} className="flex items-center gap-0.5">
      {i > 0 && <span className="text-sm font-semibold text-muted-foreground">{SEPARATOR[kind][i - 1]}</span>}
      <Input aria-label={`${label} ${SEG_LABEL[kind][i]}`} inputMode="numeric" pattern="[0-9]*" value={s}
        placeholder={guide[i] || (kind === "seconds" ? "0" : "00")}
        onChange={(e) => set(i, e.target.value)} onBlur={onBlur}
        className="h-9 w-full min-w-[2.5rem] px-1 text-center text-sm tabular-nums" />
    </span>)}
    {UNIT[kind] && <span className="pl-0.5 text-[11px] text-muted-foreground">{UNIT[kind]}</span>}
    {target != null && target > 0 && <span className="sr-only">Target {formatTime(kind, target)}</span>}
  </div>;
}
