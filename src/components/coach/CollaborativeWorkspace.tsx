import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Pencil, FolderOpen, Clock, Loader2, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';

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
  const [loading, setLoading] = useState(true);
  const [playerFilter, setPlayerFilter] = useState<string>('all');
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);

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
            </CardTitle>
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
        </CardHeader>
        <CardContent>
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
                  <div key={card.id} className="p-3 rounded-lg border space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm truncate">{card.title}</span>
                        {card.item_type && (
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">{card.item_type}</Badge>
                        )}
                      </div>
                      {card.duration_minutes && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{card.duration_minutes}min</span>
                      )}
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
    </div>
  );
}
