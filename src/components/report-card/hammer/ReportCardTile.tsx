import { Check, X, AlertCircle, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { ReportCardTileSpec, TileState } from "@/lib/reportCard";
import { cn } from "@/lib/utils";
import { RadialMeter } from "./visuals/RadialMeter";

interface Props {
  spec: ReportCardTileSpec;
  state: TileState;
  onOpen: () => void;
  index?: number;
}

export function ReportCardTile({ spec, state, onOpen, index = 0 }: Props) {
  const reduce = useReducedMotion();
  const isMissing = state.status === "missing";
  const isPass = !isMissing && state.status === "pass";
  const isFail = !isMissing && state.status === "fail";
  const isWarn = !isMissing && state.status === "warn";

  const borderClass = isMissing
    ? "rc-tile-border-missing"
    : isPass
      ? "rc-tile-border-pass"
      : isWarn
        ? "rc-tile-border-warn"
        : "rc-tile-border-fail";

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={reduce ? false : { opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.05 * index + 0.15, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      className={cn(
        "group relative flex w-full flex-col rounded-2xl border border-transparent p-4 text-left transition-all",
        "rc-glass-tile",
        borderClass,
      )}
    >
      {spec.nonNegotiable && (
        <span
          className="absolute right-2.5 top-2.5 inline-flex h-6 w-6 items-center justify-center rounded-full"
          style={{
            background: "hsl(var(--grade-c-glow) / 0.95)",
            boxShadow: "0 4px 12px hsl(var(--grade-c) / 0.5)",
          }}
          title="Non-negotiable"
        >
          <Zap className="h-3.5 w-3.5 text-foreground" strokeWidth={3} fill="currentColor" />
        </span>
      )}

      <div className="mb-2 pr-7 text-sm font-bold leading-tight">{spec.name}</div>

      <div className="flex flex-1 items-center justify-center py-3">
        {isMissing ? (
          <MissingBody reason={"missing_reason" in state ? state.missing_reason : undefined} />
        ) : spec.mode === "score_meter" ? (
          <RadialMeter
            fraction={Math.max(0, Math.min(1, ("score10" in state ? state.score10 ?? 0 : 0) / 10))}
            threshold={0.6}
            status={isPass ? "pass" : isWarn ? "warn" : "fail"}
            centerLabel={("score10" in state ? state.score10 ?? 0 : 0).toFixed(1)}
            centerSub="/ 10"
            animate={!reduce}
          />
        ) : spec.mode === "pass_fail" ? (
          <PassFailBadge pass={isPass} />
        ) : spec.mode === "raw_passed" || spec.mode === "raw_pass_fail" ? (
          <RawValueBody value={state.value ?? "—"} pass={isPass} big={spec.mode === "raw_passed"} />
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span className="truncate">{spec.standard}</span>
        {!isMissing &&
          "confidence" in state &&
          typeof state.confidence === "number" &&
          state.confidence < 0.5 && (
            <span
              title={`Low measurement confidence (${Math.round(state.confidence * 100)}%)`}
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: "hsl(var(--meter-warn))" }}
            />
          )}
      </div>
    </motion.button>
  );
}

function MissingBody({ reason }: { reason?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 text-center text-muted-foreground">
      <AlertCircle className="h-6 w-6 opacity-50" />
      <span className="text-xs font-bold uppercase tracking-wider">Not detected</span>
      {reason && <span className="text-[10px] opacity-75 line-clamp-2">{reason}</span>}
    </div>
  );
}

function PassFailBadge({ pass }: { pass: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-5 py-2.5 text-xl font-black uppercase tracking-wide text-white",
      )}
      style={{
        background: pass
          ? "linear-gradient(135deg, hsl(var(--meter-pass)), hsl(var(--grade-a-glow)))"
          : "linear-gradient(135deg, hsl(var(--meter-fail)), hsl(var(--grade-f-glow)))",
        boxShadow: pass
          ? "0 10px 24px -8px hsl(var(--meter-pass) / 0.55)"
          : "0 10px 24px -8px hsl(var(--meter-fail) / 0.55)",
      }}
    >
      {pass ? <Check className="h-5 w-5" strokeWidth={3.5} /> : <X className="h-5 w-5" strokeWidth={3.5} />}
      <span>{pass ? "Pass" : "Fail"}</span>
    </div>
  );
}

function RawValueBody({ value, pass, big }: { value: string; pass: boolean; big: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cn("font-black leading-none tracking-tight tabular-nums", big ? "text-4xl" : "text-3xl")}
        style={{
          color: pass ? "hsl(var(--meter-pass))" : "hsl(var(--meter-fail))",
          textShadow: pass
            ? "0 0 18px hsl(var(--meter-pass) / 0.45)"
            : "0 0 18px hsl(var(--meter-fail) / 0.45)",
        }}
      >
        {value}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
        )}
        style={{
          background: pass ? "hsl(var(--meter-pass) / 0.18)" : "hsl(var(--meter-fail) / 0.18)",
          color: pass ? "hsl(var(--meter-pass))" : "hsl(var(--meter-fail))",
        }}
      >
        {pass ? <Check className="h-3 w-3" strokeWidth={3.5} /> : <X className="h-3 w-3" strokeWidth={3.5} />}
        {pass ? "Pass" : "Missed"}
      </span>
    </div>
  );
}
