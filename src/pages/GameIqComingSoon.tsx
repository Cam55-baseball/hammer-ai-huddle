import { useNavigate } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";

export default function GameIqComingSoon() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8 text-center space-y-4 border-dashed">
          <div className="mx-auto w-fit rounded-full bg-primary/10 p-4">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Under construction and coming soon!</h1>
          <p className="text-sm text-muted-foreground">
            Game IQ 101 is being finished. It will unlock automatically on your plan the moment
            it's ready — nothing extra to buy or turn on.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}
