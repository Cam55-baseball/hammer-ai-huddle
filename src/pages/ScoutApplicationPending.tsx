import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function ScoutApplicationPending() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const checkApplicationStatus = async () => {
      const { data, error } = await supabase
        .from("scout_applications")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking application status:", error);
        navigate("/select-user-role");
        return;
      }

      if (!data) {
        // No application found, redirect to apply
        navigate("/scout-application");
        return;
      }

      setStatus(data.status as "pending" | "approved" | "rejected");
      setLoading(false);

      // If approved, redirect to dashboard
      if (data.status === "approved") {
        setTimeout(() => {
          navigate("/scout-dashboard");
        }, 2000);
      }
    };

    checkApplicationStatus();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("scout_application_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scout_applications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          setStatus(newStatus);
          if (newStatus === "approved") {
            setTimeout(() => {
              navigate("/scout-dashboard");
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {status === "pending" && (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <CardTitle className="text-2xl">Application Under Review</CardTitle>
              <CardDescription>
                Your scout/coach application has been submitted successfully
              </CardDescription>
            </>
          )}
          {status === "approved" && (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Application Approved!</CardTitle>
              <CardDescription>
                Congratulations! You now have scout access
              </CardDescription>
            </>
          )}
          {status === "rejected" && (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-2xl">Application Not Approved</CardTitle>
              <CardDescription>
                Unfortunately, your application was not approved at this time
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {status === "pending" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Your application is being reviewed by the owner. You will receive a notification when a decision is made.
                </p>
                <p className="text-sm text-muted-foreground">
                  This typically takes 1-3 business days.
                </p>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  Pending Review
                </Badge>
              </>
            )}
            {status === "approved" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Redirecting you to your scout dashboard...
                </p>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Approved
                </Badge>
              </>
            )}
            {status === "rejected" && (
              <>
                <p className="text-sm text-muted-foreground">
                  If you believe this was a mistake or would like to reapply, please contact support.
                </p>
                <Badge variant="outline" className="text-red-600 border-red-600">
                  Not Approved
                </Badge>
              </>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/auth")}
            className="w-full"
          >
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
