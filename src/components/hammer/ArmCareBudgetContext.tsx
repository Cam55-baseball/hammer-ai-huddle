/**
 * ArmCareBudgetContext — coordinates the daily arm-care budget across the
 * throwing card, the warm-up card, and the Wk lifts card.
 *
 * There is exactly ONE arm-care exposure allowed per day. On throwing days
 * arm care is owned by the throwing block (EASS band prep + cooldown). On
 * non-throwing days arm care lives inside the lifts card. Every other card
 * suppresses arm-care work.
 */
import { createContext, useContext } from "react";

export type ArmCareOwner = "throwing" | "lift" | "warmup" | "none";

interface Value {
  readonly owner: ArmCareOwner;
  /** True when the caller (throwing card, warmup, lifts) is NOT the owner and should suppress its own arm care. */
  suppressFor: (caller: Exclude<ArmCareOwner, "none">) => boolean;
}

const ArmCareBudgetContext = createContext<Value>({
  owner: "throwing",
  suppressFor: (caller) => caller !== "throwing",
});

export function ArmCareBudgetProvider({
  owner,
  children,
}: {
  owner: ArmCareOwner;
  children: React.ReactNode;
}) {
  const value: Value = {
    owner,
    suppressFor: (caller) => owner !== "none" && caller !== owner,
  };
  return <ArmCareBudgetContext.Provider value={value}>{children}</ArmCareBudgetContext.Provider>;
}

export function useArmCareBudget(): Value {
  return useContext(ArmCareBudgetContext);
}
