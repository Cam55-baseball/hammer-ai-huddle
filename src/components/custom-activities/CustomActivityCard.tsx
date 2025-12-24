import { useTranslation } from 'react-i18next';
import { Check, Pencil, Star, RefreshCw, Zap } from 'lucide-react';
import { CustomActivityWithLog } from '@/types/customActivity';
import { getActivityIcon } from './IconPicker';
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

  const exercisePreview = template.exercises.slice(0, 3).map(e => 
    `${e.sets || ''}${e.sets && e.reps ? '×' : ''}${e.reps || ''} ${e.name}`.trim()
  ).filter(Boolean).join(' • ');

  return (
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

      {/* Icon */}
      <button
        onClick={() => onEdit(template)}
        className="flex-shrink-0 hover:scale-105 transition-transform"
      >
        <div 
          className={cn("p-2.5 rounded-lg", isCompleted && "bg-green-500")}
          style={!isCompleted ? { backgroundColor: color } : undefined}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            "text-sm sm:text-base font-black truncate",
            isCompleted ? "text-white/50 line-through" : "text-white"
          )}>
            {template.title}
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

        {isRecurring && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-white/50">
            <RefreshCw className="h-3 w-3" />
            <span>{t('customActivity.recurring.label')}</span>
          </div>
        )}
      </div>

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
  );
}
