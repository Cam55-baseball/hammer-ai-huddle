import { ReactNode, useEffect, useRef } from "react";
import { ArrowLeft, Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export type StepChipStatus = "answered" | "open" | "neutral";

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
  /**
   * Optional answer-derived status per step index. When provided, chips are
   * highlighted by what the user has actually answered rather than by position.
   * Omit to keep the legacy positional behavior.
   */
  stepStatus?: Record<number, StepChipStatus>;
  /** Optional "x of y answered" counter shown under the step row. */
  answeredCount?: number;
  totalAnswerable?: number;
  /** Optional header overrides so non-athlete roles get their own framing. */
  eyebrow?: string;
  title?: string;
}


export function AthleteOnboardingShell({
  stepIndex,
  steps,
  children,
  onSaveAndExit,
  onBack,
  onJumpToStep,
  allowForwardJump = false,
  stepStatus,
  answeredCount,
  totalAnswerable,
  eyebrow = "Welcome to your organism",
  title = "First-run setup",
}: Props) {

  const navigate = useNavigate();
  const stepListRef = useRef<HTMLOListElement>(null);
  const activeStepRef = useRef<HTMLLIElement>(null);
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

  const showBack = !!onBack && stepIndex > 0;

  useEffect(() => {
    const list = stepListRef.current;
    const activeStep = activeStepRef.current;
    if (!list || !activeStep) return;

    const left = activeStep.offsetLeft - 12;
    const right = activeStep.offsetLeft + activeStep.offsetWidth + 12;
    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
  }, [stepIndex]);


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
                {eyebrow}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>

            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExit} className="shrink-0">
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Save & exit
          </Button>
        </header>

        <ol
          ref={stepListRef}
          className="mb-1 flex w-full items-center gap-2 overflow-x-auto overscroll-x-contain pb-2"
          aria-label="Onboarding steps"
        >
          {steps.map((label, i) => {
            const status = stepStatus?.[i];
            const answered = status ? status === "answered" : i < stepIndex;
            const neutral = status === "neutral";
            const active = i === stepIndex;
            const clickable = !!onJumpToStep && !active && (i < stepIndex || allowForwardJump);
            const chipClass = `flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium ${
              answered
                ? "border-primary bg-primary text-primary-foreground"
                : active
                ? "border-primary text-primary ring-2 ring-primary/30"
                : neutral
                ? "border-border text-muted-foreground"
                : "border-dashed border-border text-muted-foreground"
            }`;
            const chipInner = answered ? <Check className="h-3 w-3" /> : i + 1;
            const chipTitle = neutral
              ? label
              : `${label} — ${answered ? "answered" : "not answered yet"}`;
            return (
              <li
                key={label}
                ref={active ? activeStepRef : undefined}
                className="flex shrink-0 items-center gap-2"
                title={chipTitle}
              >
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onJumpToStep?.(i)}
                    className={`${chipClass} transition hover:opacity-80`}
                    aria-label={`Go to step ${i + 1}: ${chipTitle}`}
                  >
                    {chipInner}
                  </button>
                ) : (
                  <span className={chipClass} aria-label={chipTitle}>
                    {chipInner}
                  </span>
                )}
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onJumpToStep?.(i)}
                    className={`text-xs underline-offset-2 hover:text-foreground hover:underline ${
                      answered ? "text-foreground" : "text-muted-foreground"
                    }`}
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
        <p className="mb-2 text-right text-[11px] text-muted-foreground sm:hidden" aria-hidden="true">
          Swipe to see all steps →
        </p>

        {stepStatus && (
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {typeof answeredCount === "number" && typeof totalAnswerable === "number" && (
              <span className="font-medium text-foreground">
                {answeredCount} of {totalAnswerable} answered
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="flex h-3 w-3 items-center justify-center rounded-full border border-primary bg-primary" />
              Answered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-dashed border-border" />
              Still open
            </span>
          </div>
        )}


        <main className="rounded-lg border border-border bg-card p-5 shadow-sm">{children}</main>
      </div>
    </div>
  );
}
