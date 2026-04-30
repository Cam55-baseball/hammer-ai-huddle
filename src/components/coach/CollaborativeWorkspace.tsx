import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Pencil, FolderOpen, Clock, Loader2, Users, FileText, ExternalLink, Bell, CheckCheck, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { FolderDetailDialog } from '@/components/folders/FolderDetailDialog';
import { ActivityFolder } from '@/types/activityFolder';
import { toast } from 'sonner';
import { CustomActivityTemplate } from '@/types/customActivity';
import { Json } from '@/integrations/supabase/types';
import { SharedTemplateReadOnlyView } from './SharedTemplateReadOnlyView';

interface CoachNotification {
  id: string;
  sender_user_id: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  notification_type: string;
  sender_name?: string;
  template_snapshot?: Json | null;
}
interface SharedCard {
  id: string;
  title: string;
  description: string | null;
  item_type: string | null;
  duration_minutes: number | null;
  folder_id: string;
  folder_name: string;
  folder_color: string | null;
  owner_id: string;
  owner_name: string;
}

interface EditLogEntry {
  id: string;
  folder_item_id: string;
  action_type: string;
  created_at: string;
  item_title?: string;
}

export function CollaborativeWorkspace() {
  const { user } = useAuth();
  const [sharedCards, setSharedCards] = useState<SharedCard[]>([]);
  const [recentEdits, setRecentEdits] = useState<EditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<CoachNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playerFilter, setPlayerFilter] = useState<string>('all');
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<ActivityFolder | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<CustomActivityTemplate | null>(null);

  useEffect(() => {
    if (!selectedFolderId) { setSelectedFolder(null); return; }
    supabase.from('activity_folders').select('*')
      .eq('id', selectedFolderId).single()
      .then(({ data }) => {
        if (data) setSelectedFolder(data as unknown as ActivityFolder);
      });
  }, [selectedFolderId]);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('coach_notifications')
        .select('id, sender_user_id, title, message, is_read, created_at, template_snapshot')
        .eq('coach_user_id', user.id)
        .eq('notification_type', 'card_shared')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map(n => n.sender_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds);
        const nameMap: Record<string, string> = {};
        (profiles || []).forEach(p => { nameMap[p.id] = p.full_name || 'Unknown'; });

        const mapped = data.map(n => ({ ...n, sender_name: nameMap[n.sender_user_id] || 'Unknown' }));
        setNotifications(mapped);
        setUnreadCount(mapped.filter(n => !n.is_read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    };
    fetchNotifications();
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from('coach_notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    toast.success('All notifications marked as read');
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        // Get folders where this coach has permission
        const { data: perms } = await supabase
          .from('folder_coach_permissions')
          .select('folder_id')
          .eq('coach_user_id', user.id)
          .is('revoked_at', null);

        // Also get folders where coach is head coach (via athlete_mpi_settings)
        const { data: headCoachFor } = await supabase
          .from('athlete_mpi_settings')
          .select('user_id')
          .eq('primary_coach_id', user.id);

        const headCoachPlayerIds = (headCoachFor || []).map(h => h.user_id);

        let headCoachFolderIds: string[] = [];
        if (headCoachPlayerIds.length > 0) {
          const { data: hcFolders } = await supabase
            .from('activity_folders')
            .select('id')
            .in('owner_id', headCoachPlayerIds);
          headCoachFolderIds = (hcFolders || []).map(f => f.id);
        }

        const permFolderIds = (perms || []).map(p => p.folder_id);
        const allFolderIds = [...new Set([...permFolderIds, ...headCoachFolderIds])];

        if (allFolderIds.length === 0) {
          setSharedCards([]);
          setRecentEdits([]);
          setLoading(false);
          return;
        }

        // Fetch folder items
        const { data: items } = await supabase
          .from('activity_folder_items')
          .select('id, title, description, item_type, duration_minutes, folder_id')
          .in('folder_id', allFolderIds)
          .order('created_at', { ascending: false })
          .limit(50);

        // Fetch folder info
        const { data: folderInfo } = await supabase
          .from('activity_folders')
          .select('id, name, color, owner_id')
          .in('id', allFolderIds);

        const folderMap: Record<string, { name: string; color: string | null; owner_id: string }> = {};
        (folderInfo || []).forEach(f => { folderMap[f.id] = { name: f.name, color: f.color, owner_id: f.owner_id }; });

        // Get owner names
        const ownerIds = [...new Set(Object.values(folderMap).map(f => f.owner_id))];
        const { data: ownerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ownerIds);

        const nameMap: Record<string, string> = {};
        (ownerProfiles || []).forEach(p => { nameMap[p.id] = p.full_name || 'Unknown'; });

        const cards: SharedCard[] = (items || []).map(item => {
          const f = folderMap[item.folder_id] || { name: 'Unknown', color: null, owner_id: '' };
          return {
            ...item,
            folder_name: f.name,
            folder_color: f.color,
            owner_id: f.owner_id,
            owner_name: nameMap[f.owner_id] || 'Unknown',
          };
        });

        setSharedCards(cards);
        setPlayers(ownerIds.map(id => ({ id, name: nameMap[id] || 'Unknown' })));

        // Fetch recent edit logs by this coach
        const itemIds = (items || []).map(i => i.id);
        if (itemIds.length > 0) {
          const { data: logs } = await supabase
            .from('activity_edit_logs')
            .select('id, folder_item_id, action_type, created_at')
            .eq('user_id', user.id)
            .in('folder_item_id', itemIds)
            .order('created_at', { ascending: false })
            .limit(10);

          const itemTitleMap: Record<string, string> = {};
          (items || []).forEach(i => { itemTitleMap[i.id] = i.title; });

          setRecentEdits((logs || []).map(l => ({
            ...l,
            item_title: itemTitleMap[l.folder_item_id] || 'Unknown',
          })));
        }
      } catch (err) {
        console.error('Error loading collaborative workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const filteredCards = playerFilter === 'all'
    ? sharedCards
    : sharedCards.filter(c => c.owner_id === playerFilter);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Collaborative Workspace
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleMarkAllRead}>
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </Button>
              )}
              {players.length > 1 && (
              <Select value={playerFilter} onValueChange={setPlayerFilter}>
                <SelectTrigger className="h-7 w-[140px] text-xs">
                  <SelectValue placeholder="All Players" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Players</SelectItem>
                  {players.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Shared Activities - persistent section showing all notifications */}
          {notifications.length > 0 && (
            <div className="mb-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Bell className="h-3 w-3" /> Shared Activities
              </p>
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-center gap-2 text-xs p-2 rounded-md cursor-pointer hover:bg-primary/10 transition-colors ${
                    !n.is_read
                      ? 'bg-primary/5 border border-primary/20'
                      : 'bg-muted/30 border border-border'
                  }`}
                  onClick={() => {
                    if (n.template_snapshot) {
                      setViewingTemplate(n.template_snapshot as unknown as CustomActivityTemplate);
                    } else {
                      toast.info('This activity was shared before full data capture was available. Ask the player to re-share it.');
                    }
                  }}
                >
                  <Bell className="h-3 w-3 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{n.sender_name}</span>
                    <span className="text-muted-foreground"> shared </span>
                    <span className="font-medium">"{n.title}"</span>
                  </div>
                  <Eye className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {format(new Date(n.created_at), 'MMM d')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {filteredCards.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No shared cards yet</p>
              <p className="text-xs">Players can share folder items with you for editing.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="space-y-2">
                {filteredCards.map(card => (
                  <div
                    key={card.id}
                    className="p-3 rounded-lg border space-y-1 cursor-pointer transition-colors hover:bg-accent/50"
                    onClick={() => setSelectedFolderId(card.folder_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm truncate">{card.title}</span>
                        {card.item_type && (
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">{card.item_type}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {card.duration_minutes && (
                          <span className="text-[10px] text-muted-foreground">{card.duration_minutes}min</span>
                        )}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="h-2.5 w-2.5" style={{ color: card.folder_color || undefined }} />
                        {card.folder_name}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-2.5 w-2.5" />
                        {card.owner_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Recent Edits */}
      {recentEdits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recently Edited
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {recentEdits.map(edit => (
                <div key={edit.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[9px] flex-shrink-0">{edit.action_type.replace(/_/g, ' ')}</Badge>
                    <span className="truncate">{edit.item_title}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {format(new Date(edit.created_at), 'MMM d')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <FolderDetailDialog
        open={!!selectedFolder}
        onOpenChange={(open) => { if (!open) { setSelectedFolderId(null); setSelectedFolder(null); } }}
        folder={selectedFolder}
        isOwner={false}
      />

      {/* Read-only view of shared custom activity template */}
      {viewingTemplate && (
        <Dialog open={!!viewingTemplate} onOpenChange={(open) => { if (!open) setViewingTemplate(null); }}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4" />
                {viewingTemplate.title || 'Shared Activity'}
              </DialogTitle>
            </DialogHeader>
            <SharedTemplateReadOnlyView template={viewingTemplate} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
