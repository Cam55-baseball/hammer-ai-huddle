import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dumbbell, Calendar, Tag, FileText, Activity } from 'lucide-react';

interface DrillBlock {
  id?: string;
  drill_type?: string;
  intent?: string;
  volume?: number;
  execution_grade?: number;
  outcome_tags?: string[];
  micro_layer_data?: Array<{
    goal_of_rep?: string;
    actual_outcome?: string;
    rep_tags?: string[];
    [key: string]: any;
  }>;
}

interface PracticeSession {
  id: string;
  sport: string;
  session_type: string;
  session_date: string;
  module: string;
  drill_blocks: any;
  notes: string | null;
  composite_indexes: any;
  coach_grade: number | null;
  session_context: any;
}

interface PracticeSessionDetailDialogProps {
  session: PracticeSession | null;
  open: boolean;
  onClose: () => void;
}

export function PracticeSessionDetailDialog({ session, open, onClose }: PracticeSessionDetailDialogProps) {
  const { t } = useTranslation();

  if (!session) return null;

  const drillBlocks: DrillBlock[] = Array.isArray(session.drill_blocks) ? session.drill_blocks : [];
  const context = session.session_context && typeof session.session_context === 'object' ? session.session_context : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            {t('playersClub.practiceDetail', 'Practice Session Details')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Session Header */}
            <div className="space-y-2">
              <h3 className="font-semibold capitalize text-lg">
                {session.session_type?.replace(/_/g, ' ') || session.module}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(session.session_date).toLocaleDateString()}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">{session.sport}</Badge>
                <Badge variant="outline" className="capitalize">{session.module}</Badge>
                {session.coach_grade != null && (
                  <Badge variant="secondary">Grade: {session.coach_grade}</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Drill Blocks */}
            {drillBlocks.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-primary" />
                  {t('playersClub.drillBlocks', 'Drill Blocks')} ({drillBlocks.length})
                </h4>
                {drillBlocks.map((block, i) => (
                  <div key={block.id || i} className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm capitalize">
                        {block.drill_type?.replace(/_/g, ' ') || `Drill ${i + 1}`}
                      </span>
                      {block.execution_grade != null && (
                        <Badge variant="secondary" className="text-xs">{block.execution_grade}%</Badge>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap text-xs">
                      {block.intent && (
                        <Badge variant="outline" className="capitalize">{block.intent}</Badge>
                      )}
                      {block.volume != null && (
                        <Badge variant="outline">{block.volume} reps</Badge>
                      )}
                    </div>
                    {/* Outcome tags */}
                    {block.outcome_tags && block.outcome_tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        <Tag className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                        {block.outcome_tags.map((tag, ti) => (
                          <Badge key={ti} variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {tag.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Micro layer data (rep-by-rep) */}
                    {block.micro_layer_data && block.micro_layer_data.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-border/50">
                        <span className="text-xs text-muted-foreground font-medium">Rep Details</span>
                        {block.micro_layer_data.map((rep, ri) => (
                          <div key={ri} className="text-xs flex items-center gap-2">
                            <span className="text-muted-foreground w-8">#{ri + 1}</span>
                            {rep.goal_of_rep && <span className="text-muted-foreground">Goal: {rep.goal_of_rep}</span>}
                            {rep.actual_outcome && <span>→ {rep.actual_outcome}</span>}
                            {rep.rep_tags && rep.rep_tags.map((rt, rti) => (
                              <Badge key={rti} variant="outline" className="text-[9px] px-1 py-0">{rt}</Badge>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {session.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    {t('common.notes', 'Notes')}
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.notes}</p>
                </div>
              </>
            )}

            {/* Session Context */}
            {context && Object.keys(context).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">{t('playersClub.sessionContext', 'Session Context')}</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(context).map(([key, value]) => (
                      value != null && (
                        <div key={key} className="flex flex-col">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Composite Indexes */}
            {session.composite_indexes && typeof session.composite_indexes === 'object' && Object.keys(session.composite_indexes).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">{t('playersClub.compositeScores', 'Composite Scores')}</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(session.composite_indexes).map(([key, value]) => (
                      value != null && (
                        <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{typeof value === 'number' ? value.toFixed(1) : String(value)}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
