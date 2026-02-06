import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Pencil, Star, RefreshCw, Zap, Share2, Send } from 'lucide-react';
import { CustomActivityWithLog } from '@/types/customActivity';
import { getActivityIcon } from './IconPicker';
import { ShareTemplateDialog } from './ShareTemplateDialog';
import { SendToPlayerDialog } from './SendToPlayerDialog';
import { useScoutAccess } from '@/hooks/useScoutAccess';
import { cn } from '@/lib/utils';
import { hexToRgba } from '@/hooks/useUserColors';

interface CustomActivityCardProps {
  activity: CustomActivityWithLog;
  onToggleComplete: (templateId: string) => void;
  onEdit: (template: CustomActivityWithLog['template']) => void;
}

export function CustomActivityCard({ activity, onToggleComplete, onEdit }: CustomActivityCardProps) {
  const { t } = useTranslation();
  const { template, log, isRecurring } = activity;
  const isCompleted = log?.completed || false;
  const Icon = getActivityIcon(template.icon);
  const color = template.color;
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const { canSendActivities, loading: accessLoading } = useScoutAccess();

  // Use display_nickname if set, otherwise fall back to title
  const displayName = template.display_nickname || template.title;

  // Safe exercise preview that handles both array and block-based exercises
  const getExercisePreview = () => {
    // Handle block-based workout system
    if (template.exercises && typeof template.exercises === 'object' && '_useBlocks' in (template.exercises as any)) {
      const blockData = template.exercises as unknown as { _useBlocks: boolean; blocks: Array<{ name: string; exercises: any[] }> };
      const blockNames = blockData.blocks?.slice(0, 3).map(b => b.name) || [];
      return blockNames.join(' → ');
    }
    
    // Handle traditional exercise array
    if (Array.isArray(template.exercises)) {
      return template.exercises.slice(0, 3).map(e => 
        `${e.sets || ''}${e.sets && e.reps ? '×' : ''}${e.reps || ''} ${e.name}`.trim()
      ).filter(Boolean).join(' • ');
    }
    
    return '';
  };

  const exercisePreview = getExercisePreview();

  return (
    <>
      <div
        className={cn(
          "w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200",
          "border-2 relative overflow-hidden",
          isCompleted && "bg-green-500/20 border-green-500/50"
        )}
        style={!isCompleted ? {
          backgroundColor: hexToRgba(color, 0.15),
          borderColor: hexToRgba(color, 0.5),
          animation: 'custom-activity-glow 2s ease-in-out infinite',
        } : undefined}
      >
        {/* Custom badge */}
        <div 
          className="absolute top-0 right-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-bl-lg"
          style={{ 
            backgroundColor: isCompleted ? '#22c55e' : color,
            color: 'white',
          }}
        >
          {t('customActivity.badge')}
        </div>

        {/* Icon or Custom Logo */}
        <button
          onClick={() => onEdit(template)}
          className="flex-shrink-0 hover:scale-105 transition-transform"
        >
          {template.custom_logo_url ? (
            <div 
              className={cn("p-1 rounded-lg overflow-hidden", isCompleted && "bg-green-500")}
              style={!isCompleted ? { backgroundColor: color } : undefined}
            >
              <img 
                src={template.custom_logo_url} 
                alt={displayName} 
                className="h-8 w-8 sm:h-10 sm:w-10 object-cover rounded"
                onError={(e) => {
                  // Fallback to icon if image fails
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div 
              className={cn("p-2.5 rounded-lg", isCompleted && "bg-green-500")}
              style={!isCompleted ? { backgroundColor: color } : undefined}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "text-sm sm:text-base font-black truncate",
              isCompleted ? "text-white/50 line-through" : "text-white"
            )}>
              {displayName}
            </h3>
            {template.is_favorited && (
              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span>{t(`customActivity.types.${template.activity_type}`)}</span>
            {template.duration_minutes && (
              <>
                <span>•</span>
                <span>{template.duration_minutes} min</span>
              </>
            )}
            {template.intensity && (
              <>
                <span>•</span>
                <span className="capitalize">{t(`customActivity.intensity.${template.intensity}`)}</span>
              </>
            )}
          </div>

          {exercisePreview && (
            <p className="text-xs text-white/40 truncate mt-0.5">{exercisePreview}</p>
          )}

          {/* Custom Fields Preview */}
          {template.custom_fields && Array.isArray(template.custom_fields) && template.custom_fields.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(template.custom_fields as Array<{id: string; label: string; type: string; value?: string}>).slice(0, 3).map((field) => (
                <span key={field.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 flex items-center gap-1">
                  {field.type === 'checkbox' ? (
                    <>
                      <span className={cn(
                        "h-3 w-3 rounded border flex items-center justify-center flex-shrink-0",
                        field.value === 'true' ? "bg-green-500 border-green-500" : "border-white/40"
                      )}>
                        {field.value === 'true' && <Check className="h-2 w-2 text-white" />}
                      </span>
                      {field.label}
                    </>
                  ) : (
                    `${field.label}${field.value ? `: ${field.value}` : ''}`
                  )}
                </span>
              ))}
              {template.custom_fields.length > 3 && (
                <span className="text-[10px] text-white/40">+{template.custom_fields.length - 3}</span>
              )}
            </div>
          )}

          {isRecurring && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-white/50">
              <RefreshCw className="h-3 w-3" />
              <span>{t('customActivity.recurring.label')}</span>
            </div>
          )}
        </div>

        {/* Share button */}
        <button
          onClick={() => setShareDialogOpen(true)}
          className={cn(
            "flex-shrink-0 p-2 rounded-lg transition-colors",
            "hover:bg-white/10"
          )}
          title={t('customActivity.share.title', 'Share')}
        >
          <Share2 className="h-4 w-4 text-white/60" />
        </button>

        {/* Send to Player button - only for coaches/scouts */}
        {(canSendActivities || accessLoading) && (
          <button
            onClick={() => setSendDialogOpen(true)}
            disabled={accessLoading}
            className={cn(
              "flex-shrink-0 p-2 rounded-lg transition-colors",
              "hover:bg-green-500/20",
              accessLoading && "opacity-50 cursor-not-allowed"
            )}
            title={t('sentActivity.sendToPlayer', 'Send to Player')}
          >
            <Send className="h-4 w-4 text-green-400" />
          </button>
        )}

        {/* Edit button */}
        <button
          onClick={() => onEdit(template)}
          className={cn(
            "flex-shrink-0 p-2 rounded-lg transition-colors",
            "hover:bg-white/10"
          )}
        >
          <Pencil className="h-4 w-4 text-white/60" />
        </button>

        {/* Complete button */}
        <button
          onClick={() => onToggleComplete(template.id)}
          className={cn(
            "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all",
            isCompleted ? "bg-green-500 text-white" : "border-2"
          )}
          style={!isCompleted ? { borderColor: `${color}80`, borderStyle: 'dashed' } : undefined}
        >
          {isCompleted ? (
            <Check className="h-5 w-5" />
          ) : (
            <Zap className="h-4 w-4 animate-pulse" style={{ color }} />
          )}
        </button>

        <style>{`
          @keyframes custom-activity-glow {
            0%, 100% { box-shadow: 0 0 0 0 ${hexToRgba(color, 0.4)}; }
            50% { box-shadow: 0 0 0 6px ${hexToRgba(color, 0.1)}; }
          }
        `}</style>
      </div>

      <ShareTemplateDialog 
        open={shareDialogOpen} 
        onOpenChange={setShareDialogOpen} 
        template={template} 
      />

      <SendToPlayerDialog 
        open={sendDialogOpen} 
        onOpenChange={setSendDialogOpen} 
        template={template} 
      />
    </>
  );
}
