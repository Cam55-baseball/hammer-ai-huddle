import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Check, X, ExternalLink, Shield, AlertTriangle } from 'lucide-react';

export default function AdminVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingProfiles, isLoading } = useQuery({
    queryKey: ['admin-verification-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verified_stat_profiles')
        .select('*, profiles:user_id(full_name)')
        .eq('admin_verified', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({
      profileId,
      action,
      confidenceWeight,
      rejectionReason,
    }: {
      profileId: string;
      action: 'approve' | 'reject';
      confidenceWeight?: number;
      rejectionReason?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const updateData: any = {
        admin_verified: action === 'approve',
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        verified: action === 'approve',
      };

      if (action === 'approve') {
        updateData.confidence_weight = confidenceWeight ?? 100;
      } else {
        updateData.rejection_reason = rejectionReason;
        updateData.confidence_weight = 0;
      }

      const { error } = await supabase
        .from('verified_stat_profiles')
        .update(updateData)
        .eq('id', profileId);
      if (error) throw error;

      // Audit log
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: `stat_verification_${action}`,
        table_name: 'verified_stat_profiles',
        record_id: profileId,
        metadata: { confidence_weight: confidenceWeight, rejection_reason: rejectionReason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-verification-queue'] });
      toast({ title: 'Verification updated' });
    },
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Stat Verification Queue</h1>
          <Badge variant="outline">{pendingProfiles?.length ?? 0} pending</Badge>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !pendingProfiles?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-3 text-primary/50" />
              <p>No pending verifications</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingProfiles.map((profile: any) => (
              <VerificationCard
                key={profile.id}
                profile={profile}
                onAction={(action, opts) =>
                  verifyMutation.mutateAsync({ profileId: profile.id, action, ...opts })
                }
                saving={verifyMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function VerificationCard({
  profile,
  onAction,
  saving,
}: {
  profile: any;
  onAction: (action: 'approve' | 'reject', opts?: { confidenceWeight?: number; rejectionReason?: string }) => void;
  saving: boolean;
}) {
  const [confidenceWeight, setConfidenceWeight] = useState(100);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const playerName = (profile.profiles as any)?.full_name ?? 'Unknown Player';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{playerName}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs capitalize">{profile.league}</Badge>
              <Badge variant="outline" className="text-xs capitalize">{profile.sport}</Badge>
              {profile.team_name && (
                <span className="text-xs text-muted-foreground">{profile.team_name}</span>
              )}
            </div>
          </div>
          <a
            href={profile.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1 text-xs"
          >
            View Link <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Submitted {new Date(profile.created_at).toLocaleDateString()}
        </div>

        {/* Confidence weight slider */}
        <div className="space-y-1">
          <label className="text-xs font-medium">Confidence Weight: {confidenceWeight}%</label>
          <Slider
            value={[confidenceWeight]}
            onValueChange={([v]) => setConfidenceWeight(v)}
            min={10}
            max={100}
            step={5}
          />
          <p className="text-[10px] text-muted-foreground">
            Controls how much this link boosts MPI. 100% = full boost, 50% = half boost.
          </p>
        </div>

        {showReject && (
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            className="text-xs"
          />
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onAction('approve', { confidenceWeight })}
            disabled={saving}
            className="gap-1"
          >
            <Check className="h-4 w-4" /> Approve
          </Button>
          {showReject ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onAction('reject', { rejectionReason })}
              disabled={saving || !rejectionReason}
              className="gap-1"
            >
              <X className="h-4 w-4" /> Confirm Reject
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReject(true)}
              className="gap-1"
            >
              <AlertTriangle className="h-4 w-4" /> Reject
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
