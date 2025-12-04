import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function ScoutApplicationPending() {
  const { t } = useTranslation();
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
              <CardTitle className="text-2xl">{t('scoutApplicationPending.pending.title')}</CardTitle>
              <CardDescription>
                {t('scoutApplicationPending.pending.description')}
              </CardDescription>
            </>
          )}
          {status === "approved" && (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl">{t('scoutApplicationPending.approved.title')}</CardTitle>
              <CardDescription>
                {t('scoutApplicationPending.approved.description')}
              </CardDescription>
            </>
          )}
          {status === "rejected" && (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-2xl">{t('scoutApplicationPending.rejected.title')}</CardTitle>
              <CardDescription>
                {t('scoutApplicationPending.rejected.description')}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {status === "pending" && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t('scoutApplicationPending.pending.message')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('scoutApplicationPending.pending.timeframe')}
                </p>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  {t('scoutApplicationPending.pending.badge')}
                </Badge>
              </>
            )}
            {status === "approved" && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t('scoutApplicationPending.approved.message')}
                </p>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {t('scoutApplicationPending.approved.badge')}
                </Badge>
              </>
            )}
            {status === "rejected" && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t('scoutApplicationPending.rejected.message')}
                </p>
                <Badge variant="outline" className="text-red-600 border-red-600">
                  {t('scoutApplicationPending.rejected.badge')}
                </Badge>
              </>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/auth")}
            className="w-full"
          >
            {t('scoutApplicationPending.returnHome')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
