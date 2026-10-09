import { ReportProblemButton } from "./ReportProblemButton";

/** Report a problem sits at the bottom of every page, away from "Something's off". */
export function PageFooterReport() {
  return (
    <div data-page-footer-report className="flex justify-center border-t border-border px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <ReportProblemButton className="h-8 text-[12px]" />
    </div>
  );
}
