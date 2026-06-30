/**
 * undoToast — centralized 10s sonner undo pattern for gp_* ledger writes.
 *
 * Used by every game-day logger (AtBat, Defense, Baserun, Sub) so the
 * insert/delete confirmation UX is consistent and the inverse mutation
 * is always one tap away. Pure presentation helper — never authors
 * organism truth, only invokes caller-supplied mutations.
 */
import { toast } from "sonner";

export interface UndoToastOptions {
  /** Headline shown in the toast (e.g. "Defensive play saved"). */
  readonly label: string;
  /** Inverse action to run if the user taps Undo. */
  readonly undo: () => void | Promise<void>;
  /** Optional short description below the label. */
  readonly description?: string;
  /** Toast variant. Defaults to "success". */
  readonly variant?: "success" | "message";
  /** Lifetime in ms. Defaults to 10_000 to match AtBatLogger. */
  readonly duration?: number;
}

export function showUndoToast(opts: UndoToastOptions): void {
  const variant = opts.variant ?? "success";
  const fn = variant === "success" ? toast.success : toast.message;
  fn(opts.label, {
    description: opts.description,
    duration: opts.duration ?? 10_000,
    action: {
      label: "Undo",
      onClick: () => {
        try {
          const r = opts.undo();
          if (r && typeof (r as Promise<void>).then === "function") {
            (r as Promise<void>).catch((e) => {
              toast.error(`Undo failed: ${e?.message ?? "unknown error"}`);
            });
          }
        } catch (e: any) {
          toast.error(`Undo failed: ${e?.message ?? "unknown error"}`);
        }
      },
    },
  });
}
