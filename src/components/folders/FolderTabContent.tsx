import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActivityFolders } from '@/hooks/useActivityFolders';
import { useReceivedFolders } from '@/hooks/useReceivedFolders';
import { usePlayerFolders } from '@/hooks/usePlayerFolders';
import { useFolderTemplates } from '@/hooks/useFolderTemplates';
import { FolderBuilder } from './FolderBuilder';
import { FolderCard } from './FolderCard';
import { FolderDetailDialog } from './FolderDetailDialog';
import { FolderAssignDialog } from './FolderAssignDialog';
import { ReceivedFolderCard } from './ReceivedFolderCard';
import { FolderTemplateLibrary } from './FolderTemplateLibrary';
import { ActivityFolder, FolderAssignment } from '@/types/activityFolder';
import { FolderPlus, FolderOpen, Inbox, BookCopy } from 'lucide-react';
import { toast } from 'sonner';

interface FolderTabContentProps {
  selectedSport: 'baseball' | 'softball';
  isCoach: boolean;
}

const TEMPLATE_CATEGORIES = [
  { value: 'hitting', label: 'Hitting' },
  { value: 'pitching', label: 'Pitching' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'general', label: 'General' },
];

export function FolderTabContent({ selectedSport, isCoach }: FolderTabContentProps) {
  const { t } = useTranslation();
  const coachFolders = useActivityFolders(selectedSport);
  const receivedFolders = useReceivedFolders();
  const playerFolders = usePlayerFolders(selectedSport);
  const templateHook = useFolderTemplates(selectedSport);

  const [showBuilder, setShowBuilder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ActivityFolder | null>(null);
  const [detailFolder, setDetailFolder] = useState<ActivityFolder | null>(null);
  const [detailIsOwner, setDetailIsOwner] = useState(false);
  const [detailAssignmentId, setDetailAssignmentId] = useState<string | undefined>();
  const [assignFolder, setAssignFolder] = useState<ActivityFolder | null>(null);
  const [showPlayerBuilder, setShowPlayerBuilder] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [publishFolder, setPublishFolder] = useState<ActivityFolder | null>(null);
  const [publishCategory, setPublishCategory] = useState('general');
  const [publishDescription, setPublishDescription] = useState('');

  const handleCoachCreate = async (folder: Partial<ActivityFolder>) => {
    const result = await coachFolders.createFolder(folder);
    if (result) setShowBuilder(false);
    return result;
  };

  const handlePlayerCreate = async (folder: Partial<ActivityFolder>) => {
    const result = await playerFolders.createFolder(folder);
    if (result) setShowPlayerBuilder(false);
    return result;
  };

  const openDetail = (folder: ActivityFolder, isOwner: boolean, assignmentId?: string) => {
    setDetailFolder(folder);
    setDetailIsOwner(isOwner);
    setDetailAssignmentId(assignmentId);
  };

  const openReceivedDetail = (assignment: FolderAssignment) => {
    if (assignment.folder) {
      openDetail(assignment.folder, false, assignment.id);
    }
  };

  const handlePublish = async () => {
    if (!publishFolder) return;
    await templateHook.publishAsTemplate(publishFolder.id, publishCategory, publishDescription);
    setPublishFolder(null);
    setPublishCategory('general');
    setPublishDescription('');
    coachFolders.refetch();
  };

  return (
    <div className="space-y-6">
      {/* Coach Section */}
      {isCoach && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              My Folders (Coach)
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowTemplateLibrary(!showTemplateLibrary)} className="gap-1">
                <BookCopy className="h-4 w-4" /> Templates
              </Button>
              <Button size="sm" onClick={() => setShowBuilder(true)} className="gap-1">
                <FolderPlus className="h-4 w-4" /> Create Folder
              </Button>
            </div>
          </div>

          {showTemplateLibrary && (
            <FolderTemplateLibrary sport={selectedSport} onDuplicated={() => coachFolders.refetch()} />
          )}

          {showBuilder && (
            <FolderBuilder onSave={handleCoachCreate} onCancel={() => setShowBuilder(false)} />
          )}

          {coachFolders.loading ? (
            <p className="text-sm text-muted-foreground">Loading folders...</p>
          ) : coachFolders.folders.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
              No folders yet. Create one to start building structured training programs for your players.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {coachFolders.folders.map(f => (
                <FolderCard
                  key={f.id}
                  folder={f}
                  onOpen={() => openDetail(f, true)}
                  onSend={() => setAssignFolder(f)}
                  onEdit={() => setEditingFolder(f)}
                  onDelete={() => coachFolders.deleteFolder(f.id)}
                  onArchive={() => coachFolders.updateFolder(f.id, { status: 'archived' })}
                  onPublishTemplate={() => setPublishFolder(f)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Received Folders */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          Received Folders
          {receivedFolders.pendingCount > 0 && (
            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse">
              {receivedFolders.pendingCount}
            </Badge>
          )}
        </h3>

        {receivedFolders.loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : receivedFolders.assignments.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
            No folders received yet. When a coach sends you a folder, it will appear here.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {receivedFolders.assignments.map(a => (
              <ReceivedFolderCard
                key={a.id}
                assignment={a}
                onAccept={receivedFolders.acceptFolder}
                onDecline={receivedFolders.declineFolder}
                onOpen={openReceivedDetail}
              />
            ))}
          </div>
        )}
      </div>

      {/* Player Personal Folders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            My Personal Folders
          </h3>
          <Button size="sm" variant="outline" onClick={() => setShowPlayerBuilder(true)} className="gap-1">
            <FolderPlus className="h-4 w-4" /> Create
          </Button>
        </div>

        {showPlayerBuilder && (
          <FolderBuilder onSave={handlePlayerCreate} onCancel={() => setShowPlayerBuilder(false)} />
        )}

        {playerFolders.loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : playerFolders.folders.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
            Create personal folders to organize your own training activities.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {playerFolders.folders.map(f => (
              <FolderCard
                key={f.id}
                folder={f}
                onOpen={() => openDetail(f, true)}
                onDelete={() => playerFolders.deleteFolder(f.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <FolderDetailDialog
        open={!!detailFolder}
        onOpenChange={(open) => { if (!open) setDetailFolder(null); }}
        folder={detailFolder}
        isOwner={detailIsOwner}
        assignmentId={detailAssignmentId}
        onAddItem={detailIsOwner ? (detailFolder?.owner_type === 'player' ? playerFolders.addItem : coachFolders.addItem) : undefined}
        onDeleteItem={detailIsOwner ? (detailFolder?.owner_type === 'player' ? playerFolders.deleteItem : coachFolders.deleteItem) : undefined}
        onToggleCompletion={receivedFolders.toggleCompletion}
      />

      {/* Assign Dialog */}
      {assignFolder && (
        <FolderAssignDialog
          open={!!assignFolder}
          onOpenChange={(open) => { if (!open) setAssignFolder(null); }}
          folderId={assignFolder.id}
          folderName={assignFolder.name}
          onSend={(playerIds) => coachFolders.sendToPlayers(assignFolder.id, playerIds)}
        />
      )}

      {/* Edit Dialog */}
      {editingFolder && (
        <Dialog open={!!editingFolder} onOpenChange={(open) => { if (!open) setEditingFolder(null); }}>
          <DialogContent>
            <FolderBuilder
              initialData={editingFolder}
              onSave={async (updates) => {
                await coachFolders.updateFolder(editingFolder.id, updates);
                setEditingFolder(null);
                return editingFolder;
              }}
              onCancel={() => setEditingFolder(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Publish as Template Dialog */}
      {publishFolder && (
        <Dialog open={!!publishFolder} onOpenChange={(open) => { if (!open) setPublishFolder(null); }}>
          <DialogContent className="max-w-sm">
            <h3 className="font-semibold text-lg">Publish as Template</h3>
            <p className="text-sm text-muted-foreground">Share "{publishFolder.name}" with other coaches.</p>
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={publishCategory} onValueChange={setPublishCategory}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={publishDescription}
                  onChange={e => setPublishDescription(e.target.value)}
                  placeholder="Briefly describe what this template covers..."
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePublish} className="flex-1">Publish</Button>
                <Button variant="outline" onClick={() => setPublishFolder(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
