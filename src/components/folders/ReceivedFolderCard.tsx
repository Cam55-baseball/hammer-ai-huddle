import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderAssignment, DAY_LABELS } from '@/types/activityFolder';
import { FolderOpen, Check, X, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface ReceivedFolderCardProps {
  assignment: FolderAssignment;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onOpen: (assignment: FolderAssignment) => void;
}

export function ReceivedFolderCard({ assignment, onAccept, onDecline, onOpen }: ReceivedFolderCardProps) {
  const folder = assignment.folder;
  if (!folder) return null;

  const isPending = assignment.status === 'pending';

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: folder.color }}
      onClick={() => !isPending && onOpen(assignment)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="h-5 w-5 flex-shrink-0" style={{ color: folder.color }} />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{folder.name}</h3>
              {assignment.sender && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  From {assignment.sender.full_name}
                </p>
              )}
            </div>
          </div>
          <Badge variant={isPending ? 'default' : 'secondary'} className="text-[10px] flex-shrink-0">
            {assignment.status}
          </Badge>
        </div>

        {folder.description && (
          <p className="text-xs text-muted-foreground mt-2">{folder.description}</p>
        )}

        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
          {folder.label && <Badge variant="outline" className="text-[10px]">{folder.label}</Badge>}
          {folder.start_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(folder.start_date), 'MMM d')}
              {folder.end_date && ` - ${format(new Date(folder.end_date), 'MMM d')}`}
            </span>
          )}
          {folder.frequency_days && folder.frequency_days.length > 0 && (
            <span>{folder.frequency_days.map(d => DAY_LABELS[d]).join(', ')}</span>
          )}
        </div>

        {isPending && (
          <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
            <Button size="sm" className="flex-1 gap-1" onClick={() => onAccept(assignment.id)}>
              <Check className="h-3.5 w-3.5" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => onDecline(assignment.id)}>
              <X className="h-3.5 w-3.5" /> Decline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
