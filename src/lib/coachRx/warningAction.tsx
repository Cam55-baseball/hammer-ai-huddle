import { createRoot } from "react-dom/client";
import { CoachGuidelineWarningDialog } from "@/components/coach/CoachGuidelineWarningDialog";
import { warningKeys, type CoachGuidelineWarning } from "../../../supabase/functions/_shared/coach/guidelineWarnings";

export interface WarningActionResult {
  applied?: boolean; error?: string; warning_required?: boolean; reason_required?: boolean;
  warnings?: CoachGuidelineWarning[]; cancelled?: boolean;
  reasons?: string[]; [key: string]: unknown;
}

/** Resolves with the typed reason on Okay, null on Cancel. */
export function confirmCoachGuidelines(warnings: readonly CoachGuidelineWarning[]): Promise<string | null> {
  return new Promise(resolve => {
    const container = document.createElement("div"); document.body.appendChild(container);
    const root = createRoot(container);
    let answered = false;
    const finish = (reason: string | null) => {
      if (answered) return; answered = true;
      queueMicrotask(() => { root.unmount(); container.remove(); resolve(reason); });
    };
    root.render(<CoachGuidelineWarningDialog warnings={warnings} onOkay={reason => finish(reason)} onCancel={() => finish(null)} />);
  });
}

/** Recheck on the server after Okay; changed warnings require a new decision. */
export async function runCoachWarningAction<T extends WarningActionResult>(
  call: (acknowledgement?: string[], reason?: string) => Promise<T>,
  confirm: (warnings: readonly CoachGuidelineWarning[]) => Promise<string | null> = confirmCoachGuidelines,
): Promise<T | WarningActionResult> {
  let result = await call();
  const acknowledgedFindings = new Set<string>();
  let reason: string | undefined;
  let reasonPrompts = 0;
  while ((result.warning_required || result.reason_required) && result.warnings?.length) {
    const keys = warningKeys(result.warnings);
    const fingerprint = JSON.stringify(keys);
    if (result.warning_required) {
      if (acknowledgedFindings.has(fingerprint)) return { applied: false, error: "The warning could not be confirmed. Nothing was saved. Try again." };
      const answer = await confirm(result.warnings);
      if (answer === null) return { applied: false, cancelled: true };
      acknowledgedFindings.add(fingerprint);
      reason = answer;
    } else {
      // Server wants a longer typed reason: ask again, at most three times.
      if (++reasonPrompts > 3) return { applied: false, reason_required: true, error: "Type a reason of at least 10 characters. Nothing was saved." };
      const answer = await confirm(result.warnings);
      if (answer === null) return { applied: false, cancelled: true };
      reason = answer;
    }
    result = await call(keys, reason);
  }
  return result;
}
