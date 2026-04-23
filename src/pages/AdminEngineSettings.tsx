import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { Settings, Shield, Loader2 } from 'lucide-react';
import { OwnerEngineSettingsPanel } from '@/components/owner/OwnerEngineSettingsPanel';

export default function AdminEngineSettings() {
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ownerLoading && !isOwner) {
      navigate('/dashboard');
    }
  }, [isOwner, ownerLoading, navigate]);

  if (ownerLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isOwner) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Engine Settings
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Owner-only — adjust MPI weights, thresholds, and engine behavior
          </p>
        </div>

        <OwnerEngineSettingsPanel />
      </div>
    </DashboardLayout>
  );
}
