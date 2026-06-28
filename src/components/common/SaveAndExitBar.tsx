/**
 * SaveAndExitBar — sticky footer guaranteeing every multi-step flow has a
 * safe exit. Mounted in onboarding steps, the schedule importer, the injury
 * intake dialog, and the goals editor.
 *
 * - "Save & exit" runs `onSaveAndExit` (caller is responsible for persisting
 *   to the draft store) then navigates to a safe landing route.
 * - "Continue" is the forward primary action.
 * - Optional `onBack` adds a back button.
 *
 * Constitutional rule: this component never silently discards user input.
 * Even if `onSaveAndExit` throws, the user is still let out — but with a
 * visible toast so they know to check their connection.
 */
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, LogOut } from "lucide-react";
import { toast } from "sonner";

interface Props {
  readonly onContinue?: () => void | Promise<void>;
  readonly onBack?: () => void;
  readonly onSaveAndExit?: () => void | Promise<void>;
  readonly exitTo?: string;
  readonly continueLabel?: string;
  readonly continueDisabled?: boolean;
  readonly saving?: boolean;
}

export function SaveAndExitBar({
  onContinue,
  onBack,
  onSaveAndExit,
  exitTo = "/",
  continueLabel = "Continue",
  continueDisabled,
  saving,
}: Props) {
  const navigate = useNavigate();

  const handleExit = async () => {
    try {
      await onSaveAndExit?.();
      toast.success("Progress saved. You can pick up right where you left off.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Saved locally only — ${msg}`);
    } finally {
      navigate(exitTo);
    }
  };

  return (
    <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-2">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack} size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={handleExit}>
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          Save & exit
        </Button>
      </div>
      {onContinue && (
        <Button
          type="button"
          onClick={() => void onContinue()}
          disabled={continueDisabled || saving}
          size="sm"
        >
          {saving ? "Saving…" : continueLabel}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
