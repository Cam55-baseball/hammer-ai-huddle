import { Badge } from "@/components/ui/badge";
import type { SessionSummary } from "@/lib/delaycam/session/sessionSummary";
import { REASON_COPY } from "@/lib/delaycam/session/sessionSummary";

const TIER_COPY: Record<string, string> = {
  below_floor: "Too slow for movement measurement",
  t_low: "Standard speed — good for timing, not fine detail",
  t_mid: "Fast — good for most body measurements",
  t_high: "High speed — enough for ball and bat measurements once those detectors exist",
};

function fmtSec(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function SessionSummaryView({
  summary,
  isStaff,
  onSeek,
}: {
  summary: SessionSummary;
  isStaff: boolean;
  onSeek?: (sec: number) => void;
}) {
  const det = summary.rep_detection;
  const showReps = det.release === "released" || isStaff;
  const measuredRows = summary.metrics.filter((m) => m.status !== "not_released");
  const notReleased = summary.metrics.filter((m) => m.status === "not_released");

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Fact label="Length" value={summary.duration_sec != null ? `${summary.duration_sec.toFixed(1)}s` : "Unknown"} />
        <Fact label="Camera speed" value={summary.fps ? `${Math.round(summary.fps)} fps` : "Unknown"} />
        <Fact label="You in frame" value={`${Math.round(summary.tracking_coverage * 100)}%`} />
        <Fact
          label="Reps"
          value={showReps ? String(det.confident_reps) : "Checking"}
        />
      </div>
      <p className="text-xs text-muted-foreground">{TIER_COPY[summary.fps_tier] ?? ""}</p>

      <section className="space-y-2">
        <h4 className="font-semibold flex items-center gap-2">
          Reps
          {det.release !== "released" && (
            <Badge variant="outline" className="text-[10px]">{isStaff ? "Staff view — being validated" : "Being validated"}</Badge>
          )}
        </h4>
        {!showReps ? (
          <p className="text-xs text-muted-foreground">
            We split your session into reps automatically. That's being checked on real sessions before we show it, so
            your data is saved but the rep count isn't shown yet.
          </p>
        ) : (
          <>
            {summary.reps.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {summary.reps.map((r) => (
                  <button
                    key={r.rep_index}
                    type="button"
                    onClick={() => onSeek?.(r.start_ms / 1000)}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                  >
                    Rep {r.rep_index + 1} · {fmtSec(r.start_ms)}
                  </button>
                ))}
              </div>
            )}
            {det.uncertain_windows > 0 && (
              <p className="text-xs text-muted-foreground">
                {det.uncertain_windows} movement{det.uncertain_windows === 1 ? "" : "s"} we couldn't separate cleanly
                {det.uncertain[0] ? ` — ${REASON_COPY[det.uncertain[0].reason] ?? det.uncertain[0].detail}` : ""}. These
                aren't counted rather than guessed.
              </p>
            )}
            {det.confident_reps === 0 && det.uncertain_windows === 0 && (
              <p className="text-xs text-muted-foreground">
                No clear reps found{det.reason ? ` — ${REASON_COPY[det.reason] ?? det.reason}` : ""}.
              </p>
            )}
          </>
        )}
      </section>

      {measuredRows.length > 0 && (
        <section className="space-y-2">
          <h4 className="font-semibold">Measurements</h4>
          {measuredRows.map((m) => {
            const staffOnly = m.release === "staff_validation";
            const canSee = !staffOnly || isStaff;
            return (
              <div key={m.key} className="rounded-md border p-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{m.label}</span>
                  {staffOnly && <Badge variant="outline" className="text-[10px]">{isStaff ? "Staff view" : "Being validated"}</Badge>}
                </div>
                {!canSee ? (
                  <p className="text-xs text-muted-foreground">{m.release_note}</p>
                ) : m.status === "measured" ? (
                  <p className="text-xs">
                    Median {m.median}
                    {m.unit} · range {m.min}–{m.max}
                    {m.unit}
                    {m.sd != null ? ` · spread ±${m.sd}${m.unit}` : ""} · {m.n} of {m.per_rep.length} reps
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Not measured:{" "}
                    {Object.entries(m.missing_by_reason)
                      .map(([r, c]) => `${REASON_COPY[r] ?? r}${m.per_rep.length > 1 ? ` (${c} of ${m.per_rep.length} reps)` : ""}`)
                      .join(" ") || (m.missing_detail ?? "No reps to measure.")}
                    {m.missing_detail && Object.keys(m.missing_by_reason).length > 0 ? ` (${m.missing_detail})` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {notReleased.length > 0 && (
        <details className="rounded-md border p-2.5">
          <summary className="cursor-pointer font-medium">Not measured yet ({notReleased.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {notReleased.map((m) => (
              <li key={m.key}>
                <span className="font-medium text-foreground">{m.label}:</span> {m.release_note}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
