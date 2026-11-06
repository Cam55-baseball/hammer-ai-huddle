/** Dev-only harness for phone screenshots of the assessment's guided health setup. */
import { AssessmentPlanInputs } from "@/components/assessment/AssessmentPlanInputs";

export default function HealthSetupHarness() {
  return <main className="mx-auto max-w-md space-y-3 bg-background p-4"><AssessmentPlanInputs /></main>;
}
