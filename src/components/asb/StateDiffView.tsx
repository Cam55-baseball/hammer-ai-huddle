import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReplayCertificationData } from "@/hooks/useReplayCertification";
import type { JsonValue } from "@/lib/asb/replay";

interface Props {
  data: ReplayCertificationData;
}

function fmt(v: JsonValue): string {
  if (v === undefined) return "<absent>";
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function StateDiffView({ data }: Props) {
  const { certification, snapshot, reDerivation } = data;

  if (!snapshot) {
    return (
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          No state snapshot recorded as_of this event. Re-derived projection
          shown below for transparency; no diff possible.
          <pre className="mt-3 text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap break-all bg-muted p-2 rounded border border-border">
            {JSON.stringify(reDerivation.projection, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }

  const diff = certification.diff;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold uppercase tracking-wide">
                Original snapshot
              </h5>
              <Badge variant="outline" className="font-mono text-[10px]">
                engine {snapshot.engine_version}
              </Badge>
            </div>
            <pre className="text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap break-all bg-muted p-2 rounded border border-border">
              {JSON.stringify(snapshot.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold uppercase tracking-wide">
                Re-derived projection
              </h5>
              <Badge variant="outline" className="font-mono text-[10px]">
                engine {reDerivation.engine_version}
              </Badge>
            </div>
            <pre className="text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap break-all bg-muted p-2 rounded border border-border">
              {JSON.stringify(reDerivation.projection, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      {diff && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">added: {diff.added.length}</Badge>
              <Badge variant="outline">removed: {diff.removed.length}</Badge>
              <Badge variant="outline">changed: {diff.changed.length}</Badge>
              <Badge variant="outline">unchanged: {diff.unchanged.length}</Badge>
            </div>

            {diff.added.length > 0 && (
              <section>
                <h6 className="text-xs font-semibold mb-1">Added keys (re-derived only)</h6>
                <ul className="text-[10px] font-mono space-y-1">
                  {diff.added.map((k) => (
                    <li key={k} className="break-all">
                      <span className="text-primary">+ {k}</span>:{" "}
                      <pre className="inline whitespace-pre-wrap">
                        {fmt(reDerivation.projection[k])}
                      </pre>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {diff.removed.length > 0 && (
              <section>
                <h6 className="text-xs font-semibold mb-1">Removed keys (snapshot only)</h6>
                <ul className="text-[10px] font-mono space-y-1">
                  {diff.removed.map((k) => (
                    <li key={k} className="break-all">
                      <span className="text-destructive">- {k}</span>:{" "}
                      <pre className="inline whitespace-pre-wrap">
                        {fmt(snapshot.payload[k])}
                      </pre>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {diff.changed.length > 0 && (
              <section>
                <h6 className="text-xs font-semibold mb-1">Changed keys</h6>
                <div className="space-y-2">
                  {diff.changed.map(({ key, before, after }) => (
                    <div key={key} className="border border-border rounded p-2 bg-muted/30">
                      <div className="text-[10px] font-mono font-semibold mb-1 break-all">{key}</div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <div className="text-[10px] text-destructive">before (snapshot)</div>
                          <pre className="text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap break-all bg-background p-1 rounded border border-border">
                            {fmt(before)}
                          </pre>
                        </div>
                        <div>
                          <div className="text-[10px] text-primary">after (re-derived)</div>
                          <pre className="text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap break-all bg-background p-1 rounded border border-border">
                            {fmt(after)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {diff.added.length === 0 &&
              diff.removed.length === 0 &&
              diff.changed.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No key-level differences. Snapshot and re-derivation are
                  byte-equivalent under canonical JSON.
                </div>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
