import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingDemoVideoManager } from "@/components/landing/LandingDemoVideoManager";
import { LandingDemoVideo } from "@/components/landing/LandingDemoVideo";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";

export default function LandingDemoManager() {
  const navigate = useNavigate();
  const { isOwner, loading } = useOwnerAccess();

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isOwner) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Owner access required.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Landing Demo Video</h1>
          <p className="text-sm text-muted-foreground">
            Upload, replace, hide, or remove the demo video shown on the public landing page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Current preview
        </p>
        <LandingDemoVideo />
      </div>

      <LandingDemoVideoManager />
    </div>
  );
}
