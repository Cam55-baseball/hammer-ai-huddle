import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { DelayCam } from "@/components/analyze/DelayCam";

/**
 * DelayCam — its own module, not an analysis capture option.
 *
 * It gives no feedback and produces no report card. It is a delayed mirror:
 * you take a rep, then watch yourself take it seconds later. That is a
 * genuinely different purpose from capturing footage for analysis, so it
 * lives on its own instead of being buried as a mode inside the analyze flow.
 */
export default function DelayCamPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sport = (searchParams.get("sport") === "softball" ? "softball" : "baseball") as
    | "baseball"
    | "softball";
  const params = useParams();
  const moduleParam = params.module ?? searchParams.get("module");
  const module = (moduleParam === "pitching" || moduleParam === "throwing" ? moduleParam : "hitting") as
    | "hitting"
    | "pitching"
    | "throwing";

  useEffect(() => {
    document.title = `DelayCam ${module === "pitching" ? "Pitching" : "Hitting"} — Watch Yourself | Hammers Modality`;
  }, [module]);

  return (
    <DashboardLayout>
      <div className="space-y-4" data-protected-editing="true">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">DelayCam — {module === "pitching" ? "Pitching" : module === "throwing" ? "Throwing" : "Hitting"}</h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              A live camera that plays back a few seconds behind. Take your rep, turn around, and watch
              yourself do it. No scoring, no report — just your own eyes on your own swing or delivery.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>

        <DelayCam module={module} sport={sport} />
      </div>
    </DashboardLayout>
  );
}
