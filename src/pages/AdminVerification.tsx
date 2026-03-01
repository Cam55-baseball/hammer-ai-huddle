import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Check, X, ExternalLink, Shield, AlertTriangle, Image } from 'lucide-react';
import { verifiedStatBoosts } from '@/data/verifiedStatBoosts';

export default function AdminVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingProfiles, isLoading } = useQuery({
    queryKey: ['admin-verification-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verified_stat_profiles')
        .select('*, profiles:user_id(full_name, date_of_birth, position, team_affiliation, state, experience_level)')
        .eq('admin_verified', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: verifiedProfiles } = useQuery({
    queryKey: ['admin-verified-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verified_stat_profiles')
        .select('*, profiles:user_id(full_name)')
        .eq('admin_verified', true)
        .order('verified_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({
      profileId, action, confidenceWeight, rejectionReason, identityMatch, adminNotes,
    }: {
      profileId: string;
      action: 'approve' | 'reject';
      confidenceWeight?: number;
      rejectionReason?: string;
      identityMatch?: boolean;
      adminNotes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const updateData: any = {
        admin_verified: action === 'approve',
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        verified: action === 'approve',
        identity_match: identityMatch ?? false,
        admin_notes: adminNotes,
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

      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: `stat_verification_${action}`,
        table_name: 'verified_stat_profiles',
        record_id: profileId,
        metadata: { confidence_weight: confidenceWeight, rejection_reason: rejectionReason, identity_match: identityMatch },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-verification-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-verified-profiles'] });
      toast({ title: 'Verification updated' });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ profileId, reason }: { profileId: string; reason: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('verified_stat_profiles')
        .update({
          verified: false,
          admin_verified: false,
          confidence_weight: 0,
          rejection_reason: reason,
          removal_requested: false,
        } as any)
        .eq('id', profileId);
      if (error) throw error;

      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'stat_verification_revoke',
        table_name: 'verified_stat_profiles',
        record_id: profileId,
        metadata: { reason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-verified-profiles'] });
      toast({ title: 'Verification revoked' });
    },
  });

  const removalRequested = (pendingProfiles ?? []).filter((p: any) => p.removal_requested);
  const pendingCount = (pendingProfiles?.length ?? 0) + removalRequested.length;

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Stat Verification Queue</h1>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending ({pendingProfiles?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="verified">Verified ({verifiedProfiles?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
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
          </TabsContent>

          <TabsContent value="verified">
            {!verifiedProfiles?.length ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No verified profiles yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {verifiedProfiles.map((profile: any) => (
                  <RevokeCard
                    key={profile.id}
                    profile={profile}
                    onRevoke={(reason) => revokeMutation.mutateAsync({ profileId: profile.id, reason })}
                    saving={revokeMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

/* ─── Verification Card (Pending) ─── */

function VerificationCard({
  profile, onAction, saving,
}: {
  profile: any;
  onAction: (action: 'approve' | 'reject', opts?: { confidenceWeight?: number; rejectionReason?: string; identityMatch?: boolean; adminNotes?: string }) => void;
  saving: boolean;
}) {
  const [confidenceWeight, setConfidenceWeight] = useState(100);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  // Identity match checklist
  const profileData = (profile.profiles as any) ?? {};
  const playerName = profileData.full_name ?? 'Unknown Player';
  const fields = [
    { key: 'name', label: 'Full Name', value: profileData.full_name },
    { key: 'dob', label: 'Date of Birth', value: profileData.date_of_birth },
    { key: 'position', label: 'Position', value: profileData.position },
    { key: 'team', label: 'Team', value: profileData.team_affiliation },
    { key: 'state', label: 'State', value: profileData.state },
  ];
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const matchCount = Object.values(checks).filter(Boolean).length;
  const canApprove = matchCount >= 3;

  // Load screenshot if exists
  useState(() => {
    if (profile.screenshot_path) {
      const { data } = supabase.storage.from('vault-photos').getPublicUrl(profile.screenshot_path);
      setScreenshotUrl(data?.publicUrl || null);
    }
  });

  const boostLabel = profile.profile_type
    ? verifiedStatBoosts[profile.profile_type]?.label || profile.profile_type
    : profile.league;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{playerName}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">{boostLabel}</Badge>
              <Badge variant="outline" className="text-xs capitalize">{profile.sport}</Badge>
              {profile.team_name && <span className="text-xs text-muted-foreground">{profile.team_name}</span>}
              {profile.removal_requested && <Badge variant="destructive" className="text-xs">Removal Requested</Badge>}
            </div>
          </div>
          <a href={profile.profile_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
            View Link <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Submitted {new Date(profile.created_at).toLocaleDateString()}
        </div>

        {/* Screenshot */}
        {screenshotUrl && (
          <div className="rounded border p-1">
            <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Image className="h-3 w-3" /> Uploaded Screenshot</p>
            <img src={screenshotUrl} alt="Verification screenshot" className="max-h-48 rounded object-contain" />
          </div>
        )}

        {/* Identity Match Checklist */}
        <div className="space-y-1.5 rounded border p-2">
          <p className="text-xs font-medium">Identity Match ({matchCount}/5 — need 3+)</p>
          {fields.map(f => (
            <label key={f.key} className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={!!checks[f.key]}
                onCheckedChange={(v) => setChecks(prev => ({ ...prev, [f.key]: !!v }))}
              />
              <span className="text-muted-foreground w-20">{f.label}:</span>
              <span className={f.value ? '' : 'text-muted-foreground italic'}>{f.value || 'Not set'}</span>
            </label>
          ))}
        </div>

        {/* Confidence weight slider */}
        <div className="space-y-1">
          <label className="text-xs font-medium">Confidence Weight: {confidenceWeight}%</label>
          <Slider value={[confidenceWeight]} onValueChange={([v]) => setConfidenceWeight(v)} min={10} max={100} step={5} />
          <p className="text-[10px] text-muted-foreground">Controls boost strength. 100% = full boost.</p>
        </div>

        {/* Admin Notes */}
        <Textarea
          placeholder="Admin notes (optional)..."
          value={adminNotes}
          onChange={e => setAdminNotes(e.target.value)}
          className="text-xs"
          rows={2}
        />

        {showReject && (
          <Textarea
            placeholder="Reason for rejection (required)..."
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            className="text-xs"
          />
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onAction('approve', { confidenceWeight, identityMatch: canApprove, adminNotes })}
            disabled={saving || !canApprove}
            className="gap-1"
          >
            <Check className="h-4 w-4" /> Approve {!canApprove && '(Need 3+ matches)'}
          </Button>
          {showReject ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onAction('reject', { rejectionReason, adminNotes })}
              disabled={saving || !rejectionReason}
              className="gap-1"
            >
              <X className="h-4 w-4" /> Confirm Reject
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowReject(true)} className="gap-1">
              <AlertTriangle className="h-4 w-4" /> Reject
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Revoke Card (Verified) ─── */

function RevokeCard({
  profile, onRevoke, saving,
}: {
  profile: any;
  onRevoke: (reason: string) => void;
  saving: boolean;
}) {
  const [showRevoke, setShowRevoke] = useState(false);
  const [reason, setReason] = useState('');
  const playerName = (profile.profiles as any)?.full_name ?? 'Unknown Player';
  const boostLabel = profile.profile_type
    ? verifiedStatBoosts[profile.profile_type]?.label || profile.profile_type
    : profile.league;

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-3 px-4">
        <div>
          <span className="font-medium text-sm">{playerName}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-[10px] capitalize">{boostLabel}</Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{profile.sport}</Badge>
            {profile.confidence_weight != null && (
              <span className="text-[10px] text-muted-foreground">{profile.confidence_weight}%</span>
            )}
            {profile.removal_requested && <Badge variant="destructive" className="text-[10px]">Removal Requested</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={profile.profile_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline flex items-center gap-1">
            Link <ExternalLink className="h-3 w-3" />
          </a>
          {showRevoke ? (
            <div className="flex items-center gap-1">
              <Textarea
                placeholder="Revocation reason..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="text-xs h-8 w-40"
                rows={1}
              />
              <Button size="sm" variant="destructive" onClick={() => onRevoke(reason)} disabled={saving || !reason}>
                Confirm
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowRevoke(true)} className="text-destructive">
              Revoke
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
