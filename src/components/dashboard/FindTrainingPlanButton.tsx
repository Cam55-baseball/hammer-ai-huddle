// Owner Nov 7: the Dashboard's "Find Your Training Plan" button, restyled as a full-width
// card-style button. What it does is unchanged: it opens the plans page on the given sport.
import { ChevronRight, Sparkles } from "lucide-react";
import { BRAND_GRADIENT, BRAND_TEXT_SHADOW } from "@/components/dashboard/brandGradient";

export function FindTrainingPlanButton({ onClick, subtitle }: { onClick: () => void; subtitle?: string | null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Find Your Training Plan"
      aria-describedby={subtitle ? "find-training-plan-subtitle" : undefined}
      data-find-training-plan
      className={`group w-full min-h-[76px] rounded-xl border-2 border-primary/60 px-4 py-3 text-left
                  text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.4)] ${BRAND_GRADIENT}
                  transition-[transform,box-shadow] duration-150 ease-out
                  hover:shadow-[0_0_36px_hsl(var(--primary)/0.6)] active:scale-[0.98]
                  motion-reduce:transition-none motion-reduce:active:scale-100
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
    >
      <span className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background/90 shadow-sm">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
        </span>
        <span className={`min-w-0 flex-1 ${BRAND_TEXT_SHADOW}`}>
          <span className="block text-lg font-extrabold leading-tight">Find Your Training Plan</span>
          {subtitle && (
            <span id="find-training-plan-subtitle" className="mt-0.5 block text-xs font-semibold leading-snug opacity-95">
              {subtitle}
            </span>
          )}
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/90 transition-transform duration-150 group-hover:translate-x-0.5 group-active:translate-x-1">
          <ChevronRight className="h-5 w-5 text-primary" aria-hidden />
        </span>
      </span>
    </button>
  );
}

/** Subtitle naming only what the plans page will actually show this account. */
export function findPlanSubtitle({ isStaffAccount, canShowPurchaseUI }: { isStaffAccount: boolean; canShowPurchaseUI: boolean }): string | null {
  if (isStaffAccount) return canShowPurchaseUI ? "Coach & Org plans" : null;
  return canShowPurchaseUI ? "Pitcher · 5Tool · Golden 2Way · Coach & Org plans · Add-ons" : "Pitcher · 5Tool · Golden 2Way";
}
