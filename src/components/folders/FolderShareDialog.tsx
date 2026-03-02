import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Share2, X, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface CoachEntry {
  id: string;
  name: string;
  isHeadCoach: boolean;
  currentPermission: 'none' | 'view' | 'edit';
  permissionId?: string;
}

interface FolderShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
}

export function FolderShareDialog({ open, onOpenChange, folderId, folderName }: FolderShareDialogProps) {
  const [coaches, setCoaches] = useState<CoachEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    loadCoaches();
  }, [open, folderId]);

  const loadCoaches = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const userId = userData.user.id;

      // Fetch linked coaches, head coach, and existing permissions in parallel
      const [followsRes, mpiRes, permsRes] = await Promise.all([
        supabase
          .from('scout_follows')
          .select('scout_id')
          .eq('player_id', userId)
          .eq('status', 'accepted')
          .eq('relationship_type', 'linked'),
        supabase
          .from('athlete_mpi_settings')
          .select('primary_coach_id')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('folder_coach_permissions')
          .select('id, coach_user_id, permission_level')
          .eq('folder_id', folderId)
          .is('revoked_at', null),
      ]);

      const coachIds = (followsRes.data || []).map((f: any) => f.scout_id);
      if (coachIds.length === 0) { setCoaches([]); setLoading(false); return; }

      const headCoachId = mpiRes.data?.primary_coach_id || null;
      const permMap = new Map<string, { level: string; id: string }>();
      (permsRes.data || []).forEach((p: any) => {
        permMap.set(p.coach_user_id, { level: p.permission_level, id: p.id });
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', coachIds);

      const entries: CoachEntry[] = (profiles || []).map((p: any) => {
        const perm = permMap.get(p.id);
        return {
          id: p.id,
          name: p.full_name || 'Unknown Coach',
          isHeadCoach: p.id === headCoachId,
          currentPermission: p.id === headCoachId ? 'edit' : (perm?.level as 'view' | 'edit') || 'none',
          permissionId: perm?.id,
        };
      });

      // Head coach first
      entries.sort((a, b) => (a.isHeadCoach ? -1 : b.isHeadCoach ? 1 : 0));
      setCoaches(entries);
    } catch (err) {
      console.error('Error loading coaches:', err);
      toast.error('Failed to load coaches');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (coach: CoachEntry, newLevel: 'view' | 'edit' | 'none') => {
    if (coach.isHeadCoach) return;
    setSaving(coach.id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      if (newLevel === 'none') {
        // Revoke
        if (coach.permissionId) {
          await supabase
            .from('folder_coach_permissions')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', coach.permissionId);
        }
        toast.success(`Revoked access for ${coach.name}`);
      } else if (coach.permissionId) {
        // Update existing
        await supabase
          .from('folder_coach_permissions')
          .update({ permission_level: newLevel })
          .eq('id', coach.permissionId);
        toast.success(`Updated to ${newLevel} access`);
      } else {
        // Insert new
        await supabase
          .from('folder_coach_permissions')
          .insert({
            folder_id: folderId,
            coach_user_id: coach.id,
            granted_by: userData.user.id,
            permission_level: newLevel,
          });
        toast.success(`${newLevel === 'view' ? 'View' : 'Edit'} access granted`);
      }

      // Refresh
      await loadCoaches();
    } catch (err) {
      console.error('Error updating permission:', err);
      toast.error('Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Share Folder
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Manage coach access to "<span className="font-medium">{folderName}</span>"
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading coaches...</p>
        ) : coaches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No linked coaches found. Connect with a coach first.
          </p>
        ) : (
          <div className="space-y-3 mt-2">
            {coaches.map(coach => (
              <div key={coach.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{coach.name}</p>
                  {coach.isHeadCoach && (
                    <Badge variant="secondary" className="text-[10px] mt-1 gap-1">
                      <Shield className="h-3 w-3" /> Head Coach
                    </Badge>
                  )}
                </div>

                {coach.isHeadCoach ? (
                  <Badge variant="outline" className="text-[10px] whitespace-nowrap">Auto – Full Access</Badge>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RadioGroup
                      value={coach.currentPermission}
                      onValueChange={(val) => handlePermissionChange(coach, val as 'view' | 'edit' | 'none')}
                      className="flex gap-2"
                      disabled={saving === coach.id}
                    >
                      <div className="flex items-center gap-1">
                        <RadioGroupItem value="view" id={`view-${coach.id}`} className="h-3.5 w-3.5" />
                        <Label htmlFor={`view-${coach.id}`} className="text-xs cursor-pointer">View</Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <RadioGroupItem value="edit" id={`edit-${coach.id}`} className="h-3.5 w-3.5" />
                        <Label htmlFor={`edit-${coach.id}`} className="text-xs cursor-pointer">Edit</Label>
                      </div>
                    </RadioGroup>
                    {coach.currentPermission !== 'none' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handlePermissionChange(coach, 'none')}
                        disabled={saving === coach.id}
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
