import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Status = 'none' | 'pending' | 'approved' | 'rejected' | string;

/**
 * Self-service scout upgrade for coaches. Submitting is self-service; granting
 * is not — the application still goes to owner/admin review and no role is
 * awarded automatically.
 */
export function ScoutUpgradeCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('scout_applications')
        .select('status, applying_as, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setStatus(((data as { status?: string } | null)?.status as Status) ?? 'none');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking scout application status…
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Scout privileges
        </CardTitle>
        <CardDescription>
          Scout access adds cross-program player search and evaluation tools on top of your coach
          account. Applications are reviewed by staff — approval is never automatic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === 'pending' && (
          <Badge variant="secondary" className="gap-1 px-3 py-1.5 text-sm">
            <Clock className="h-4 w-4" /> Application under review
          </Badge>
        )}
        {status === 'approved' && (
          <Badge variant="default" className="gap-1 px-3 py-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4" /> Approved
          </Badge>
        )}
        {status === 'rejected' && (
          <Badge variant="destructive" className="gap-1 px-3 py-1.5 text-sm">
            <XCircle className="h-4 w-4" /> Not approved — you may re-apply
          </Badge>
        )}

        {status !== 'pending' && status !== 'approved' && (
          <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate('/scout-application')}>
            <Search className="h-4 w-4 mr-2" />
            Apply to become a scout
          </Button>
        )}
        {status === 'pending' && (
          <p className="text-sm text-muted-foreground">
            We'll notify you once a reviewer has looked at your application.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
