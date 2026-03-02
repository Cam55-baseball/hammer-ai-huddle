import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FolderOpen, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FolderInfo {
  id: string;
  name: string;
  color: string | null;
}

interface CoachInfo {
  id: string;
  full_name: string;
  is_head_coach: boolean;
}

interface Permission {
  folder_id: string;
  coach_id: string;
  level: 'view' | 'edit';
  permission_id: string;
}

export function FolderPermissionMatrix() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [coaches, setCoaches] = useState<CoachInfo[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Subscribe to head coach changes for reactivity
  const { data: headCoachId } = useQuery({
    queryKey: ['head-coach', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_mpi_settings')
        .select('primary_coach_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.primary_coach_id as string | null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        // Fetch player's folders
        const { data: folderData } = await supabase
          .from('activity_folders')
          .select('id, name, color')
          .eq('owner_id', user.id)
          .order('name');

        setFolders((folderData || []) as FolderInfo[]);

        // Fetch linked coaches
        const { data: follows } = await supabase
          .from('scout_follows')
          .select('scout_id')
          .eq('player_id', user.id)
          .eq('status', 'accepted')
          .eq('relationship_type', 'linked');

        const coachIds = (follows || []).map(f => f.scout_id);
        if (coachIds.length === 0) {
          setCoaches([]);
          setPermissions([]);
          setLoading(false);
          return;
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', coachIds);

        setCoaches((profiles || []).map(p => ({
          id: p.id,
          full_name: p.full_name || 'Unknown',
          is_head_coach: p.id === headCoachId,
        })));

        // Fetch existing permissions
        const folderIds = (folderData || []).map(f => f.id);
        if (folderIds.length > 0) {
          const { data: perms } = await supabase
            .from('folder_coach_permissions')
            .select('id, folder_id, coach_user_id, permission_level')
            .in('folder_id', folderIds)
            .in('coach_user_id', coachIds)
            .is('revoked_at', null);

          setPermissions((perms || []).map(p => ({
            folder_id: p.folder_id,
            coach_id: p.coach_user_id,
            level: p.permission_level as 'view' | 'edit',
            permission_id: p.id,
          })));
        }
      } catch (err) {
        console.error('Error loading permission matrix:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, headCoachId]);

  // Update is_head_coach flag when headCoachId changes without full reload
  useEffect(() => {
    setCoaches(prev => prev.map(c => ({
      ...c,
      is_head_coach: c.id === headCoachId,
    })));
  }, [headCoachId]);

  const getPermission = (folderId: string, coachId: string) => {
    return permissions.find(p => p.folder_id === folderId && p.coach_id === coachId);
  };

  const handleToggle = async (folderId: string, coachId: string, level: 'view' | 'edit') => {
    if (!user) return;
    const key = `${folderId}-${coachId}-${level}`;
    setToggling(key);

    try {
      const existing = getPermission(folderId, coachId);

      if (existing) {
        if (existing.level === level) {
          // Revoke
          await supabase
            .from('folder_coach_permissions')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', existing.permission_id);
          setPermissions(prev => prev.filter(p => p.permission_id !== existing.permission_id));
          toast.success('Permission revoked');
        } else {
          // Update level
          await supabase
            .from('folder_coach_permissions')
            .update({ permission_level: level })
            .eq('id', existing.permission_id);
          setPermissions(prev => prev.map(p =>
            p.permission_id === existing.permission_id ? { ...p, level } : p
          ));
          toast.success(`Updated to ${level} access`);
        }
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('folder_coach_permissions')
          .insert({
            folder_id: folderId,
            coach_user_id: coachId,
            granted_by: user.id,
            permission_level: level,
          })
          .select('id')
          .single();

        if (error) throw error;
        setPermissions(prev => [...prev, {
          folder_id: folderId,
          coach_id: coachId,
          level,
          permission_id: data.id,
        }]);
        toast.success(`${level} access granted`);
      }
    } catch (err) {
      console.error('Error toggling permission:', err);
      toast.error('Failed to update permission');
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (coaches.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No linked coaches. Connect with coaches to manage folder permissions.
        </CardContent>
      </Card>
    );
  }

  if (folders.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No folders created yet. Create folders to manage coach access.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Folder Permissions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Folder</th>
                {coaches.map(c => (
                  <th key={c.id} className="text-center py-2 px-2 font-medium" colSpan={c.is_head_coach ? 1 : 2}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="truncate max-w-[80px]">{c.full_name}</span>
                      {c.is_head_coach && (
                        <Badge variant="default" className="text-[8px] h-3.5 px-1">Head Coach</Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="border-b">
                <th></th>
                {coaches.map(c => c.is_head_coach ? (
                  <th key={c.id} className="text-center py-1 text-[10px] text-muted-foreground">Full Access</th>
                ) : (
                  <th key={`${c.id}-labels`} className="text-center py-1" colSpan={2}>
                    <div className="flex justify-center gap-3 text-[10px] text-muted-foreground">
                      <span>View</span>
                      <span>Edit</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {folders.map(folder => (
                <tr key={folder.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <FolderOpen className="h-3 w-3 flex-shrink-0" style={{ color: folder.color || undefined }} />
                      <span className="truncate max-w-[120px] font-medium">{folder.name}</span>
                    </div>
                  </td>
                  {coaches.map(c => {
                    if (c.is_head_coach) {
                      return (
                        <td key={c.id} className="text-center py-2">
                          <Badge variant="secondary" className="text-[8px]">Auto</Badge>
                        </td>
                      );
                    }
                    const perm = getPermission(folder.id, c.id);
                    const viewKey = `${folder.id}-${c.id}-view`;
                    const editKey = `${folder.id}-${c.id}-edit`;
                    return (
                      <td key={c.id} className="text-center py-2" colSpan={2}>
                        <div className="flex justify-center gap-3">
                          <Checkbox
                            checked={perm?.level === 'view' || perm?.level === 'edit'}
                            disabled={toggling === viewKey}
                            onCheckedChange={() => handleToggle(folder.id, c.id, 'view')}
                          />
                          <Checkbox
                            checked={perm?.level === 'edit'}
                            disabled={toggling === editKey}
                            onCheckedChange={() => handleToggle(folder.id, c.id, 'edit')}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
