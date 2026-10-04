import { HMLoadingFallback } from "@/components/loading/HMLoadingScreen";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ConnectionsTab } from "@/components/connections/ConnectionsTab";

export default function MyFollowers() {
  const { user, session, loading: authLoading, isAuthStable } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && isAuthStable && !user && !session) {
      navigate("/auth", { replace: true });
    }
  }, [user, session, authLoading, isAuthStable, navigate]);

  if (authLoading)  return <HMLoadingFallback />;

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Connections</h1>
          <p className="text-muted-foreground">
            Manage your coaches, permissions, and connection requests
          </p>
        </div>
        <ConnectionsTab />
      </div>
    </DashboardLayout>
  );
}
