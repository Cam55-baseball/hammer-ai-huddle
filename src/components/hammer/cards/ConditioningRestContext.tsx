import { createContext, useContext, useState, type ReactNode } from "react";
import { conditioningRestAfterRep, type BaseRep } from "../../../../supabase/functions/_shared/wic/runRest";

export interface ConditioningRestState {
  bases: number;
  rest: { seconds: number; rep: number; reachedHome: boolean; startedAt: number } | null;
}
const EMPTY: ConditioningRestState = { bases: 0, rest: null };

export function nextConditioningRest(prior: ConditioningRestState, basesPerRep: BaseRep, now: number): ConditioningRestState {
  const next = conditioningRestAfterRep(prior.bases, basesPerRep);
  return { bases: next.bases, rest: { seconds: next.seconds, reachedHome: next.reachedHome, rep: (prior.rest?.rep ?? 0) + 1, startedAt: now } };
}

const ConditioningRestContext = createContext<{
  state: ConditioningRestState;
  finishRep: (bases: BaseRep) => void;
} | null>(null);

/** One session counter, shared through exercise log portals. No training writes. */
export function ConditioningRestProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(EMPTY);
  const finishRep = (bases: BaseRep) => setState(prior => nextConditioningRest(prior, bases, Date.now()));
  return <ConditioningRestContext.Provider value={{ state, finishRep }}>{children}</ConditioningRestContext.Provider>;
}

export function useConditioningRest() {
  const shared = useContext(ConditioningRestContext);
  const [local, setLocal] = useState(EMPTY);
  return shared ?? { state: local, finishRep: (bases: BaseRep) => setLocal(prior => nextConditioningRest(prior, bases, Date.now())) };
}