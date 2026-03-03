import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Send, Loader2, Users, FolderOpen, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LinkedCoach {
  id: string;
  scout_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface SendCardToCoachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  itemTitle: string;
}

export function SendCardToCoachDialog({ open, onOpenChange, folderId, folderName, itemTitle }: SendCardToCoachDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<LinkedCoach[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<LinkedCoach | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const fetchLinkedCoaches = async () => {
      setLoading(true);
      try {
        const { data: follows } = await supabase
          .from('scout_follows')
          .select('id, scout_id')
          .eq('player_id', user.id)
          .eq('status', 'accepted')
          .eq('relationship_type', 'linked');

        if (!follows || follows.length === 0) {
          setCoaches([]);
          setLoading(false);
          return;
        }

        const coachIds = follows.map(f => f.scout_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', coachIds);

        const mapped: LinkedCoach[] = (follows || []).map(f => {
          const p = profiles?.find(pr => pr.id === f.scout_id);
          return {
            id: f.id,
            scout_id: f.scout_id,
            full_name: p?.full_name || 'Unknown Coach',
            avatar_url: p?.avatar_url || null,
          };
        });
        setCoaches(mapped);
      } catch (err) {
        console.error('Error fetching linked coaches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLinkedCoaches();
  }, [open, user]);

  const insertNotification = async (coach: LinkedCoach) => {
    if (!user) return;
    try {
      await supabase.from('coach_notifications').insert({
        coach_user_id: coach.scout_id,
        sender_user_id: user.id,
        notification_type: 'card_shared',
        title: itemTitle,
        message: folderId ? `Shared from folder "${folderName}"` : 'Shared standalone activity',
      });
    } catch (err) {
      console.error('Error inserting coach notification:', err);
    }
  };

  const handleSelectCoach = async (coach: LinkedCoach) => {
    if (!user) return;

    // If no folder context (standalone custom activity), just share directly
    if (!folderId) {
      await insertNotification(coach);
      toast.success(`"${itemTitle}" shared with ${coach.full_name} for editing`);
      onOpenChange(false);
      return;
    }

    // Check if coach already has folder permission
    const { data: existing } = await supabase
      .from('folder_coach_permissions')
      .select('id')
      .eq('folder_id', folderId)
      .eq('coach_user_id', coach.scout_id)
      .is('revoked_at', null)
      .maybeSingle();

    if (existing) {
      await insertNotification(coach);
      toast.success(`"${itemTitle}" shared with ${coach.full_name} for editing`);
      onOpenChange(false);
    } else {
      setSelectedCoach(coach);
      setNeedsPermission(true);
    }
  };

  const handleGrantAndSend = async () => {
    if (!selectedCoach || !user) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('folder_coach_permissions')
        .insert({
          folder_id: folderId,
          coach_user_id: selectedCoach.scout_id,
          granted_by: user.id,
          permission_level: 'edit',
        });
      if (error) throw error;
      await insertNotification(selectedCoach);
      toast.success(`Folder access granted & "${itemTitle}" shared with ${selectedCoach.full_name}`);
      setNeedsPermission(false);
      setSelectedCoach(null);
      onOpenChange(false);
    } catch (err) {
      console.error('Error granting permission:', err);
      toast.error('Failed to grant access');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Dialog open={open && !needsPermission} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4" />
              Send to Coach for Editing
            </DialogTitle>
          </DialogHeader>

          <div className="text-xs text-muted-foreground mb-2">
            Select a linked coach to share <span className="font-medium text-foreground">"{itemTitle}"</span> for editing.
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : coaches.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No linked coaches found</p>
              <p className="text-xs">Connect with a coach first via Connections.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {coaches.map(coach => (
                  <button
                    key={coach.id}
                    onClick={() => handleSelectCoach(coach)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={coach.avatar_url || undefined} />
                      <AvatarFallback>{coach.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{coach.full_name}</p>
                      <Badge variant="secondary" className="text-[10px]">Linked</Badge>
                    </div>
                    <Send className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={needsPermission} onOpenChange={(open) => { if (!open) { setNeedsPermission(false); setSelectedCoach(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Grant Folder Access
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{selectedCoach?.full_name}</span> doesn't have access to the folder <span className="font-medium text-foreground">"{folderName}"</span>. Grant edit access to share this card?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGrantAndSend} disabled={sending} className="gap-1">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Grant Access & Share
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
