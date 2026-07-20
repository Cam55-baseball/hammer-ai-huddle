import { ReactNode } from "react";
import { ArrowLeft, Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  stepIndex: number;
  steps: string[];
  children: ReactNode;
  /** Optional draft-persist hook called when the user clicks the header Save & exit. */
  onSaveAndExit?: () => void | Promise<void>;
  /** Optional back handler; when omitted or on step 0, the back button is hidden. */
  onBack?: () => void;
  /** Optional jump-to-step (only invoked for indices < stepIndex unless allowForwardJump). */
  onJumpToStep?: (index: number) => void;
  /** When true, stepper chips are clickable for every step (forward and back). */
  allowForwardJump?: boolean;
}

export function AthleteOnboardingShell({
  stepIndex,
  steps,
  children,
  onSaveAndExit,
  onBack,
  onJumpToStep,
  allowForwardJump = false,
}: Props) {
  const navigate = useNavigate();
  const handleExit = async () => {
    try {
      await onSaveAndExit?.();
      toast.success("Progress saved. Resume from your profile any time.");
    } catch (e) {
      toast.error(`Saved locally only — ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      navigate("/dashboard");
    }
  };

  const showBack = !!onBack && stepIndex > 0 && stepIndex < steps.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-4 pb-24 pt-8 sm:px-6">
        <header className="mb-6 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            {showBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="shrink-0"
                aria-label="Back to previous step"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back
              </Button>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Welcome to your organism
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">First-run setup</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExit} className="shrink-0">
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Save & exit
          </Button>
        </header>

        <ol className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
          {steps.map((label, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            const clickable = done && !!onJumpToStep;
            const chipClass = `flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium ${
              done
                ? "border-primary bg-primary text-primary-foreground"
                : active
                ? "border-primary text-primary"
                : "border-border text-muted-foreground"
            }`;
            const chipInner = done ? <Check className="h-3 w-3" /> : i + 1;
            return (
              <li key={label} className="flex shrink-0 items-center gap-2">
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onJumpToStep?.(i)}
                    className={`${chipClass} transition hover:opacity-80`}
                    aria-label={`Return to step ${i + 1}: ${label}`}
                  >
                    {chipInner}
                  </button>
                ) : (
                  <span className={chipClass}>{chipInner}</span>
                )}
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onJumpToStep?.(i)}
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {label}
                  </button>
                ) : (
                  <span
                    className={`text-xs ${
                      active ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                )}
                {i < steps.length - 1 && <span className="h-px w-4 bg-border" />}
              </li>
            );
          })}
        </ol>

        <main className="rounded-lg border border-border bg-card p-5 shadow-sm">{children}</main>
      </div>
    </div>
  );
}
