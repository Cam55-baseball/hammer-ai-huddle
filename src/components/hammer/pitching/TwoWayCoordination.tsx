/**
 * Two-way coordination — lets the Pitching card broadcast a high-effort
 * mound day so the Bat-speed card can soften its own prescription.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";

export interface PitchingIntent {
  readonly highEffort: boolean;         // start/game day
  readonly moundToday: boolean;         // any mound work
  readonly reason: string | null;
}

const Ctx = createContext<PitchingIntent | null>(null);

export function TwoWayCoordinationProvider({
  intent,
  children,
}: {
  intent: PitchingIntent;
  children: ReactNode;
}) {
  const value = useMemo(() => intent, [intent.highEffort, intent.moundToday, intent.reason]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Returns null if there is no pitching card mounted today (non-pitcher). */
export function useOptionalPitchingIntent(): PitchingIntent | null {
  return useContext(Ctx);
}
