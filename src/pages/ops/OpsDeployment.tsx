/**
 * Wave 2 — Deployment integrity screen.
 */
import { useEffect, useState } from "react";
import { OpsShell } from "@/components/ops/OpsShell";
import {
  runBootValidation,
  type BootValidationResult,
} from "@/lib/bootstrap/bootValidation";

export default function OpsDeployment() {
  const [result, setResult] = useState<BootValidationResult | null>(null);
  useEffect(() => {
    setResult(runBootValidation());
  }, []);
  return (
    <OpsShell>
      <h1 className="text-xl font-semibold mb-4">Deployment Integrity</h1>
      <div className="text-xs text-muted-foreground mb-4">
        engine_version: {result?.engineVersion ?? "—"}
      </div>
      <ul className="border border-border rounded divide-y divide-border">
        {(result?.checks ?? []).map((c) => (
          <li
            key={c.name}
            className="flex items-center justify-between px-3 py-2 text-sm"
          >
            <span className="font-mono text-xs">{c.name}</span>
            <span
              className={
                c.pass ? "text-emerald-500" : "text-destructive font-medium"
              }
            >
              {c.pass ? "pass" : "fail"}
            </span>
          </li>
        ))}
      </ul>
    </OpsShell>
  );
}
