import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityFolder, ActivityFolderItem } from '@/types/activityFolder';
import { toast } from 'sonner';

export function useActivityFolders(sport: string) {
  const [folders, setFolders] = useState<ActivityFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFolders = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('activity_folders')
        .select('*')
        .eq('owner_id', userData.user.id)
        .eq('sport', sport)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFolders((data || []) as unknown as ActivityFolder[]);
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  }, [sport]);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  const createFolder = async (folder: Partial<ActivityFolder>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data, error } = await supabase
        .from('activity_folders')
        .insert({
          ...folder,
          owner_id: userData.user.id,
          owner_type: 'coach',
          sport,
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success('Folder created');
      await fetchFolders();
      return data as unknown as ActivityFolder;
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
      return null;
    }
  };

  const updateFolder = async (id: string, updates: Partial<ActivityFolder>) => {
    try {
      const { error } = await supabase
        .from('activity_folders')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
      toast.success('Folder updated');
      await fetchFolders();
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error('Failed to update folder');
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('activity_folders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Folder deleted');
      await fetchFolders();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const addItem = async (folderId: string, item: Partial<ActivityFolderItem>) => {
    try {
      const { data, error } = await supabase
        .from('activity_folder_items')
        .insert({ ...item, folder_id: folderId } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success('Item added');
      return data as unknown as ActivityFolderItem;
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
      return null;
    }
  };

  const updateItem = async (itemId: string, updates: Partial<ActivityFolderItem>) => {
    try {
      const { error } = await supabase
        .from('activity_folder_items')
        .update(updates as any)
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Item updated');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('activity_folder_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Item removed');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to remove item');
    }
  };

  const fetchItems = async (folderId: string): Promise<ActivityFolderItem[]> => {
    try {
      const { data, error } = await supabase
        .from('activity_folder_items')
        .select('*')
        .eq('folder_id', folderId)
        .order('order_index');

      if (error) throw error;
      return (data || []) as unknown as ActivityFolderItem[];
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  };

  const sendToPlayers = async (folderId: string, playerIds: string[]) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      const inserts = playerIds.map(pid => ({
        folder_id: folderId,
        sender_id: userData.user!.id,
        recipient_id: pid,
        status: 'pending',
      }));

      const { error } = await supabase
        .from('folder_assignments')
        .insert(inserts as any);

      if (error) throw error;

      // Mark folder as active
      await supabase
        .from('activity_folders')
        .update({ status: 'active' } as any)
        .eq('id', folderId);

      toast.success(`Folder sent to ${playerIds.length} player(s)!`);
      await fetchFolders();
      return true;
    } catch (error: any) {
      console.error('Error sending folder:', error);
      toast.error(error?.code === '23505' ? 'Folder already sent to one or more players' : 'Failed to send folder');
      return false;
    }
  };

  return {
    folders,
    loading,
    createFolder,
    updateFolder,
    deleteFolder,
    addItem,
    updateItem,
    deleteItem,
    fetchItems,
    sendToPlayers,
    refetch: fetchFolders,
  };
}
