import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActivityFolder } from '@/types/activityFolder';
import { FolderOpen, Calendar, Send, MoreVertical, Trash2, Archive, Edit, BookCopy } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface FolderCardProps {
  folder: ActivityFolder;
  onOpen: (folder: ActivityFolder) => void;
  onSend?: (folder: ActivityFolder) => void;
  onEdit?: (folder: ActivityFolder) => void;
  onDelete?: (folder: ActivityFolder) => void;
  onArchive?: (folder: ActivityFolder) => void;
  onPublishTemplate?: (folder: ActivityFolder) => void;
  itemCount?: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-500/10 text-green-700 dark:text-green-400',
  completed: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  archived: 'bg-muted text-muted-foreground',
};

export function FolderCard({ folder, onOpen, onSend, onEdit, onDelete, onArchive, onPublishTemplate, itemCount }: FolderCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: folder.color }}
      onClick={() => onOpen(folder)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="h-5 w-5 flex-shrink-0" style={{ color: folder.color }} />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{folder.name}</h3>
              {folder.description && (
                <p className="text-xs text-muted-foreground truncate">{folder.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <Badge className={STATUS_STYLES[folder.status] || ''} variant="secondary">
              {folder.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onSend && folder.status !== 'archived' && (
                  <DropdownMenuItem onClick={() => onSend(folder)}>
                    <Send className="h-4 w-4 mr-2" /> Send to Players
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(folder)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                )}
                {onArchive && folder.status !== 'archived' && (
                  <DropdownMenuItem onClick={() => onArchive(folder)}>
                    <Archive className="h-4 w-4 mr-2" /> Archive
                  </DropdownMenuItem>
                )}
                {onPublishTemplate && !folder.is_template && folder.status !== 'archived' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onPublishTemplate(folder)}>
                      <BookCopy className="h-4 w-4 mr-2" /> Publish as Template
                    </DropdownMenuItem>
                  </>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={() => onDelete(folder)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
          {folder.label && <Badge variant="outline" className="text-[10px]">{folder.label}</Badge>}
          {folder.start_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(folder.start_date), 'MMM d')}
              {folder.end_date && ` - ${format(new Date(folder.end_date), 'MMM d')}`}
            </span>
          )}
          {itemCount !== undefined && (
            <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
