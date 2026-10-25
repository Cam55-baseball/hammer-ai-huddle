import { createRoot } from "react-dom/client";
import { CoachGuidelineWarningDialog } from "@/components/coach/CoachGuidelineWarningDialog";
import { warningKeys, type CoachGuidelineWarning } from "../../../supabase/functions/_shared/coach/guidelineWarnings";

export interface WarningActionResult {
  applied?: boolean; error?: string; warning_required?: boolean;
  warnings?: CoachGuidelineWarning[]; cancelled?: boolean;
  reasons?: string[]; [key: string]: unknown;
}

export function confirmCoachGuidelines(warnings: readonly CoachGuidelineWarning[]): Promise<boolean> {
  return new Promise(resolve => {
    const container = document.createElement("div"); document.body.appendChild(container);
    const root = createRoot(container);
    let answered = false;
    const finish = (accepted: boolean) => {
      if (answered) return; answered = true;
      queueMicrotask(() => { root.unmount(); container.remove(); resolve(accepted); });
    };
    root.render(<CoachGuidelineWarningDialog warnings={warnings} onOkay={() => finish(true)} onCancel={() => finish(false)} />);
  });
}

/** Recheck on the server after Okay; changed warnings require a new decision. */
export async function runCoachWarningAction<T extends WarningActionResult>(
  call: (acknowledgement?: string[]) => Promise<T>,
  confirm: (warnings: readonly CoachGuidelineWarning[]) => Promise<boolean> = confirmCoachGuidelines,
): Promise<T | WarningActionResult> {
  let result = await call();
  const acknowledgedFindings = new Set<string>();
  while (result.warning_required && result.warnings?.length) {
    const keys = warningKeys(result.warnings);
    const fingerprint = JSON.stringify(keys);
    if (acknowledgedFindings.has(fingerprint)) return { applied: false, error: "The warning could not be confirmed. Nothing was saved. Try again." };
    if (!await confirm(result.warnings)) return { applied: false, cancelled: true };
    acknowledgedFindings.add(fingerprint);
    result = await call(keys);
  }
  return result;
}