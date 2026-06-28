import { ReactNode } from "react";
import { Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  stepIndex: number;
  steps: string[];
  children: ReactNode;
  /** Optional draft-persist hook called when the user clicks the header Save & exit. */
  onSaveAndExit?: () => void | Promise<void>;
}

export function AthleteOnboardingShell({ stepIndex, steps, children, onSaveAndExit }: Props) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-4 pb-24 pt-8 sm:px-6">
        <header className="mb-6 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Welcome to your organism
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">First-run setup</h1>
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
            return (
              <li key={label} className="flex shrink-0 items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium ${
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span
                  className={`text-xs ${
                    active ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
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
