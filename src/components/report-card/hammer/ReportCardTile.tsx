import { Check, X, AlertCircle, Lock } from "lucide-react";
import type { ReportCardTileSpec, TileState } from "@/lib/reportCard";
import { cn } from "@/lib/utils";

interface Props {
  spec: ReportCardTileSpec;
  state: TileState;
  onOpen: () => void;
}

/**
 * Universal Hammer Report Card tile. Renders one of four display modes —
 * raw+passed, pass/fail, raw+pass/fail, or 1–10 meter — based on the spec.
 * Tap opens the explainer sheet.
 */
export function ReportCardTile({ spec, state, onOpen }: Props) {
  const isMissing = state.status === "missing";
  const isPass = !isMissing && state.status === "pass";
  const isFail = !isMissing && state.status === "fail";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative flex w-full flex-col rounded-2xl border bg-card p-4 text-left transition-all",
        "hover:border-primary/50 hover:shadow-lg active:scale-[0.99]",
        spec.nonNegotiable && "border-primary/40",
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-tight">{spec.name}</span>
        {spec.nonNegotiable && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            Non-Negotiable
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 items-center justify-center py-2">
        {isMissing ? (
          <MissingBody />
        ) : spec.mode === "pass_fail" ? (
          <PassFailBadge pass={isPass} />
        ) : spec.mode === "raw_passed" ? (
          <RawPassedBody value={state.value ?? "—"} pass={isPass} />
        ) : spec.mode === "raw_pass_fail" ? (
          <RawPassFailBody value={state.value ?? "—"} pass={isPass} />
        ) : spec.mode === "score_meter" ? (
          <ScoreMeter score={"score10" in state ? state.score10 ?? 0 : 0} pass={isPass} fail={isFail} />
        ) : null}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Lock className="h-3 w-3 opacity-60" />
        <span>{spec.standard}</span>
      </div>
    </button>
  );
}

function MissingBody() {
  return (
    <div className="flex flex-col items-center gap-1 text-muted-foreground">
      <AlertCircle className="h-6 w-6 opacity-50" />
      <span className="text-xs">Not detected yet</span>
    </div>
  );
}

function PassFailBadge({ pass }: { pass: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-4 py-2 text-2xl font-extrabold",
        pass ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground",
      )}
    >
      {pass ? <Check className="h-6 w-6" strokeWidth={3} /> : <X className="h-6 w-6" strokeWidth={3} />}
      <span>{pass ? "PASS" : "FAIL"}</span>
    </div>
  );
}

function RawPassedBody({ value, pass }: { value: string; pass: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-4xl font-extrabold tracking-tight">{value}</span>
      <span
        className={cn(
          "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
          pass ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
        )}
      >
        {pass ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
        {pass ? "Passed" : "Missed"}
      </span>
    </div>
  );
}

function RawPassFailBody({ value, pass }: { value: string; pass: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-3xl font-extrabold tracking-tight">{value}</span>
      <PassFailBadge pass={pass} />
    </div>
  );
}

function ScoreMeter({ score, pass, fail }: { score: number; pass: boolean; fail: boolean }) {
  const pct = Math.max(0, Math.min(10, score)) / 10;
  const circumference = 2 * Math.PI * 32;
  const dash = circumference * pct;
  const color = pass ? "stroke-primary" : fail ? "stroke-destructive" : "stroke-amber-500";
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" className="fill-none stroke-muted" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r="32"
          className={cn("fill-none transition-all", color)}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold leading-none">{score.toFixed(1)}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 10</span>
      </div>
    </div>
  );
}
