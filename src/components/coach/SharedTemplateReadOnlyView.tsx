import { Badge } from '@/components/ui/badge';
import { Clock, Dumbbell, Utensils, Footprints, Target } from 'lucide-react';
import { CustomActivityTemplate, CustomField, Exercise, RunningInterval } from '@/types/customActivity';
import { getActivityIcon } from '@/components/custom-activities';

interface SharedTemplateReadOnlyViewProps {
  template: CustomActivityTemplate;
}

export function SharedTemplateReadOnlyView({ template }: SharedTemplateReadOnlyViewProps) {
  const Icon = getActivityIcon(template.icon);
  const exercises = Array.isArray(template.exercises) ? template.exercises as Exercise[] : [];
  const customFields = Array.isArray(template.custom_fields) ? template.custom_fields as CustomField[] : [];
  const meals = template.meals as any;
  const intervals = Array.isArray(template.intervals) ? template.intervals as RunningInterval[] : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {template.custom_logo_url ? (
          <img src={template.custom_logo_url} alt={template.title} className="h-10 w-10 rounded-lg object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: template.color || '#6366f1' }}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
        <div>
          <p className="font-semibold text-sm">{template.display_nickname || template.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{template.activity_type}</span>
            {template.duration_minutes && (
              <>
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>{template.duration_minutes} min</span>
              </>
            )}
            {template.intensity && (
              <>
                <span>•</span>
                <span className="capitalize">{template.intensity}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {template.description && (
        <p className="text-xs text-muted-foreground">{template.description}</p>
      )}

      {/* Running details */}
      {template.activity_type === 'running' && (template.distance_value || template.pace_value) && (
        <div className="flex items-center gap-3 text-xs">
          {template.distance_value && (
            <span className="flex items-center gap-1">
              <Footprints className="h-3 w-3" />
              {template.distance_value} {template.distance_unit || 'mi'}
            </span>
          )}
          {template.pace_value && (
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {template.pace_value}
            </span>
          )}
        </div>
      )}

      {/* Exercises */}
      {exercises.length > 0 && (
        <div>
          <p className="text-xs font-semibold flex items-center gap-1 mb-1.5">
            <Dumbbell className="h-3 w-3" /> Exercises
          </p>
          <div className="space-y-1">
            {exercises.map((ex, i) => (
              <div key={i} className="text-xs p-2 rounded-md bg-muted/50 flex justify-between">
                <span>{ex.name}</span>
                <span className="text-muted-foreground">
                  {ex.sets && `${ex.sets}×`}{ex.reps || ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom fields */}
      {customFields.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5">Custom Fields</p>
          <div className="space-y-1">
            {customFields.map(f => (
              <div key={f.id} className="text-xs p-2 rounded-md bg-muted/50 flex items-center justify-between">
                <span>{f.label}</span>
                <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meals */}
      {meals?.items && Array.isArray(meals.items) && meals.items.length > 0 && (
        <div>
          <p className="text-xs font-semibold flex items-center gap-1 mb-1.5">
            <Utensils className="h-3 w-3" /> Meals
          </p>
          <div className="space-y-1">
            {meals.items.map((item: any, i: number) => (
              <div key={i} className="text-xs p-2 rounded-md bg-muted/50">
                <span className="font-medium">{item.name}</span>
                {item.calories && <span className="text-muted-foreground ml-2">{item.calories} cal</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intervals */}
      {intervals.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5">Intervals</p>
          <div className="space-y-1">
            {intervals.map((iv, i) => (
              <div key={i} className="text-xs p-2 rounded-md bg-muted/50 flex justify-between">
                <span>{iv.type || 'Interval'}</span>
                <span className="text-muted-foreground">{iv.duration}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule info */}
      {template.display_days && template.display_days.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Scheduled: </span>
          {template.display_days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
        </div>
      )}
    </div>
  );
}
