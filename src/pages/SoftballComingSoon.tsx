import { useNavigate } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";

interface SoftballComingSoonProps {
  /** Athlete-facing feature name, e.g. "Tex Vision". */
  featureName?: string;
}

export default function SoftballComingSoon({
  featureName,
}: SoftballComingSoonProps) {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8 text-center space-y-4 border-dashed">
          <div className="mx-auto w-fit rounded-full bg-primary/10 p-4">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">
            {featureName ? `${featureName} — softball version coming soon` : "Coming soon for softball"}
          </h1>
          <p className="text-sm text-muted-foreground">
            We'd rather hold this back than hand you baseball answers for a
            softball question. It unlocks automatically on your plan the moment
            the softball version is ready — nothing extra to buy or turn on.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}
