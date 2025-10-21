import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const OwnerDashboard = () => {
  const { isOwner, loading } = useOwnerAccess();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isOwner) {
      navigate("/");
    }
  }, [isOwner, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isOwner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">H</span>
            </div>
            <h1 className="text-xl font-bold">Owner Dashboard</h1>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome, Owner</h2>
            <p className="text-muted-foreground">
              Comprehensive oversight and management of all app modules
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 transition-all">
              <h3 className="text-xl font-bold mb-2">User Management</h3>
              <p className="text-muted-foreground mb-4">
                View and edit all user profiles and roles
              </p>
              <Button variant="outline" className="w-full">
                Manage Users
              </Button>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 transition-all">
              <h3 className="text-xl font-bold mb-2">Real-Time Analytics</h3>
              <p className="text-muted-foreground mb-4">
                Access comprehensive performance metrics
              </p>
              <Button variant="outline" className="w-full">
                View Analytics
              </Button>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 transition-all">
              <h3 className="text-xl font-bold mb-2">System Settings</h3>
              <p className="text-muted-foreground mb-4">
                Configure app-wide settings and permissions
              </p>
              <Button variant="outline" className="w-full">
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
