import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { NotificationsPreferencesPanel } from "@/components/notifications/NotificationsPreferencesPanel";

export default function NotificationsSettings() {
  const { user, loading, isAuthStable } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthStable && !user) navigate("/auth", { replace: true });
  }, [loading, isAuthStable, user, navigate]);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how you want to be alerted to escalations. Every notification
            links back to the source event so you can audit the lineage.
          </p>
        </header>
        <NotificationsPreferencesPanel />
      </div>
    </DashboardLayout>
  );
}
