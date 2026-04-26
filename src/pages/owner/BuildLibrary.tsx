/**
 * PHASE 10.5 — Owner Build Library
 * Owner-only view of locally persisted builds (programs / bundles / consultations).
 * No DB. Reads from localStorage via ownerBuildStorage.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Library } from 'lucide-react';
import { getBuilds, type BuildItem } from '@/lib/ownerBuildStorage';

const TYPE_LABEL: Record<BuildItem['type'], string> = {
  program: 'Program',
  bundle: 'Bundle',
  consultation: 'Consultation',
};

function formatWhen(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

export default function BuildLibrary() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const [builds, setBuilds] = useState<BuildItem[]>([]);

  useEffect(() => {
    if (!loading && !isOwner) navigate('/dashboard');
  }, [isOwner, loading, navigate]);

  useEffect(() => {
    setBuilds(getBuilds());
  }, []);

  if (loading) {
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
            <Library className="h-8 w-8" />
            Your Builds
          </h1>
          <p className="text-muted-foreground mt-1">
            Programs, bundles, and consultations you've created.
          </p>
        </div>

        {builds.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No builds yet — create one from your videos.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {builds.map((b) => (
              <Card key={b.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{b.name || 'Untitled'}</h3>
                    <Badge variant="secondary" className="text-[10px]">{TYPE_LABEL[b.type]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatWhen(b.createdAt)}</p>
                  {b.meta?.videoId && (
                    <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
                      video: {b.meta.videoId}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
