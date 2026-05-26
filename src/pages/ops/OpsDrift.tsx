/**
 * Wave 2 — Projection drift monitor.
 *
 * Runs the parity sampler against the current scope. Triage surface only.
 * Does not auto-mutate projections.
 */
import { useState } from "react";
import { OpsShell } from "@/components/ops/OpsShell";
import { sampleParity, type ParityMonitorSample } from "@/lib/ops/parityMonitor";

export default function OpsDrift() {
  const [sample, setSample] = useState<ParityMonitorSample | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    // Suite expects ParityInputs[]; empty array exercises the suite shell
    // safely. Real samples are wired by the host page when projections are
    // available (Wave 1 builders).
    const result = await sampleParity([]);
    setSample(result);
    setRunning(false);
  };

  return (
    <OpsShell>
      <h1 className="text-xl font-semibold mb-4">Projection Drift</h1>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={run}
          disabled={running}
          className="border border-border rounded px-3 py-1 text-sm hover:bg-muted/40 disabled:opacity-50"
        >
          {running ? "Sampling…" : "Run parity sample"}
        </button>
        {sample && (
          <span className="text-xs text-muted-foreground">
            Last run: {sample.ranAt} · {sample.passed}/{sample.total} passed
          </span>
        )}
      </div>
      {sample && sample.violations.length > 0 && (
        <div className="border border-destructive/40 rounded">
          <div className="bg-destructive/10 px-3 py-2 text-sm font-medium">
            {sample.violations.length} violation(s)
          </div>
          <ul className="divide-y divide-border">
            {sample.violations.map((v, i) => (
              <li key={i} className="px-3 py-2 text-xs font-mono">
                <div className="text-muted-foreground">
                  {v.subsystem} · {v.event_id}
                </div>
                <div>{v.mismatch_reason}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {sample && sample.violations.length === 0 && (
        <div className="text-sm text-muted-foreground">No drift detected.</div>
      )}
    </OpsShell>
  );
}
