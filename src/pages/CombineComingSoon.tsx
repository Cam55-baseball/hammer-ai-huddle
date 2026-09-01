import { useNavigate } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";

/**
 * Combine is locked pre-release for BOTH sides:
 *  - athlete-facing results (/combine/results)
 *  - evaluator paperwork (/combine/entry)
 *
 * Every /combine/* route renders this coming-soon state so nobody — athlete,
 * scout, coach, or staff — can enter data into a module that isn't finished.
 */
export default function CombineComingSoon() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card className="space-y-4 border-dashed p-8 text-center">
          <div className="mx-auto w-fit rounded-full bg-primary/10 p-4">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Combine — coming soon</h1>
          <p className="text-sm text-muted-foreground">
            The Combine module (athlete results and evaluator paperwork) is still being
            finished. It's closed to everyone for now so no partial data gets recorded.
            It will unlock automatically the moment it's ready — nothing extra to buy or
            turn on.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}
