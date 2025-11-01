import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Video, Check, X } from "lucide-react";
import { format } from "date-fns";

interface ScoutApplicationCardProps {
  application: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    sport: string;
    organization_letter_url: string | null;
    video_submission_url: string | null;
    status: string;
    created_at: string;
  };
  onUpdate: () => void;
}

export function ScoutApplicationCard({ application, onUpdate }: ScoutApplicationCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: "approve" | "deny") => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("approve-scout-application", {
        body: {
          application_id: application.id,
          action,
        },
      });

      if (error) throw error;

      toast({
        title: action === "approve" ? "Application Approved" : "Application Denied",
        description: `${application.first_name} ${application.last_name}'s application has been ${action}d`,
      });

      onUpdate();
    } catch (error: any) {
      console.error(`Error ${action}ing application:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} application`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openFile = (url: string | null) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <Card className="p-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <h3 className="text-xl font-bold">
              {application.first_name} {application.last_name}
            </h3>
            <p className="text-sm text-muted-foreground">{application.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {application.sport}
            </Badge>
            {application.status !== "pending" && (
              <Badge
                variant={application.status === "approved" ? "default" : "destructive"}
                className="capitalize"
              >
                {application.status}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Applied: {format(new Date(application.created_at), "MMM d, yyyy")}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => openFile(application.organization_letter_url)}
            disabled={!application.organization_letter_url}
          >
            <FileText className="mr-2 h-4 w-4" />
            View Organization Letter
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => openFile(application.video_submission_url)}
            disabled={!application.video_submission_url}
          >
            <Video className="mr-2 h-4 w-4" />
            View Video Submission
          </Button>

          {application.status === "pending" && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => handleAction("approve")}
                disabled={loading}
                className="flex-1"
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => handleAction("deny")}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Deny
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
