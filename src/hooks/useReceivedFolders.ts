import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FolderAssignment, ActivityFolder, ActivityFolderItem, FolderItemCompletion } from '@/types/activityFolder';
import { toast } from 'sonner';

export function useReceivedFolders() {
  const [assignments, setAssignments] = useState<FolderAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchAssignments = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Get assignments
      const { data: assignData, error } = await supabase
        .from('folder_assignments')
        .select('*')
        .eq('recipient_id', userData.user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      if (!assignData || assignData.length === 0) {
        setAssignments([]);
        setPendingCount(0);
        setLoading(false);
        return;
      }

      // Fetch folder details
      const folderIds = [...new Set(assignData.map(a => a.folder_id))];
      const senderIds = [...new Set(assignData.map(a => a.sender_id))];

      const [foldersRes, profilesRes] = await Promise.all([
        supabase.from('activity_folders').select('*').in('id', folderIds),
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', senderIds),
      ]);

      const folderMap = new Map((foldersRes.data || []).map(f => [f.id, f]));
      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

      const enriched: FolderAssignment[] = assignData.map(a => ({
        ...a,
        status: a.status as 'pending' | 'accepted' | 'declined',
        folder: folderMap.get(a.folder_id) as unknown as ActivityFolder,
        sender: profileMap.get(a.sender_id) ? {
          full_name: profileMap.get(a.sender_id)!.full_name || 'Unknown',
          avatar_url: profileMap.get(a.sender_id)!.avatar_url,
        } : { full_name: 'Unknown', avatar_url: null },
      }));

      setAssignments(enriched);
      setPendingCount(enriched.filter(a => a.status === 'pending').length);
    } catch (error) {
      console.error('Error fetching received folders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();

    // Realtime subscription
    const setup = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const channel = supabase
        .channel('received-folders')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'folder_assignments',
          filter: `recipient_id=eq.${userData.user.id}`,
        }, () => {
          fetchAssignments();
          toast.info('New folder received from your coach!');
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    setup();
  }, [fetchAssignments]);

  const acceptFolder = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('folder_assignments')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        } as any)
        .eq('id', assignmentId);

      if (error) throw error;
      toast.success('Folder accepted! It will appear in your Game Plan.');
      await fetchAssignments();
    } catch (error) {
      console.error('Error accepting folder:', error);
      toast.error('Failed to accept folder');
    }
  };

  const declineFolder = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('folder_assignments')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
        } as any)
        .eq('id', assignmentId);

      if (error) throw error;
      toast.success('Folder declined');
      await fetchAssignments();
    } catch (error) {
      console.error('Error declining folder:', error);
      toast.error('Failed to decline folder');
    }
  };

  const toggleCompletion = async (
    itemId: string,
    entryDate: string,
    assignmentId?: string,
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Check if completion exists
      const { data: existing } = await supabase
        .from('folder_item_completions')
        .select('id, completed')
        .eq('folder_item_id', itemId)
        .eq('user_id', userData.user.id)
        .eq('entry_date', entryDate)
        .maybeSingle();

      if (existing) {
        const newCompleted = !existing.completed;
        await supabase
          .from('folder_item_completions')
          .update({
            completed: newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : null,
          } as any)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('folder_item_completions')
          .insert({
            folder_item_id: itemId,
            user_id: userData.user.id,
            folder_assignment_id: assignmentId || null,
            entry_date: entryDate,
            completed: true,
            completed_at: new Date().toISOString(),
          } as any);
      }
    } catch (error) {
      console.error('Error toggling completion:', error);
      toast.error('Failed to update completion');
    }
  };

  return {
    assignments,
    pendingCount,
    loading,
    acceptFolder,
    declineFolder,
    toggleCompletion,
    refetch: fetchAssignments,
  };
}
