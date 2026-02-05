import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { EnhancedExercise, ViewMode } from '@/types/eliteWorkout';
import { calculateExerciseCNS, formatCNSLoad } from '@/utils/loadCalculation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  GripVertical, ChevronDown, Trash2, Settings2, AlertTriangle
} from 'lucide-react';
import { AdvancedFieldsPanel } from './AdvancedFieldsPanel';

interface EnhancedExerciseCardProps {
  exercise: EnhancedExercise;
  index: number;
  viewMode: ViewMode;
  onUpdate: (exercise: EnhancedExercise) => void;
  onDelete: () => void;
}

export function EnhancedExerciseCard({ 
  exercise, 
  index, 
  viewMode, 
  onUpdate, 
  onDelete 
}: EnhancedExerciseCardProps) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const cnsLoad = calculateExerciseCNS(exercise);
  const cnsFormat = formatCNSLoad(cnsLoad);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const handleChange = (field: keyof EnhancedExercise, value: any) => {
    onUpdate({ ...exercise, [field]: value });
  };
  
  // Execute mode: minimal view
  if (viewMode === 'execute') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'flex items-center gap-3 p-3 bg-background/80 rounded-lg',
          isDragging && 'opacity-50'
        )}
      >
        <span className="text-lg font-bold text-muted-foreground w-6">
          {index + 1}
        </span>
        <div className="flex-1">
          <p className="font-medium">{exercise.name}</p>
          <p className="text-sm text-muted-foreground">
            {exercise.sets && exercise.reps && `${exercise.sets} × ${exercise.reps}`}
            {exercise.rest && ` • ${exercise.rest}s rest`}
            {exercise.weight && ` • ${exercise.weight} ${exercise.weightUnit || 'lbs'}`}
          </p>
        </div>
        {exercise.pain_warning && (
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        )}
      </div>
    );
  }
  
  // Coach/Parent mode: editable
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-background/80 rounded-lg border transition-all',
        isDragging && 'opacity-50 shadow-lg',
        exercise.pain_warning && 'border-amber-500/50'
      )}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing touch-none mt-1"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        
        {/* Index */}
        <span className="text-sm font-bold text-muted-foreground w-5 mt-2">
          {index + 1}
        </span>
        
        {/* Main content */}
        <div className="flex-1 space-y-3">
          {/* Name row */}
          <div className="flex items-center gap-2">
            <Input
              value={exercise.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="h-8 text-sm font-medium"
              placeholder={t('eliteWorkout.exerciseName', 'Exercise name')}
            />
            
            {/* CNS badge (coach only) */}
            {viewMode === 'coach' && (
              <Badge variant="outline" className={cn('text-xs flex-shrink-0', cnsFormat.color)}>
                {cnsLoad}
              </Badge>
            )}
            
            {/* Pain warning */}
            {exercise.pain_warning && (
              <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50 flex-shrink-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {exercise.pain_warning.severity}
              </Badge>
            )}
          </div>
          
          {/* Basic fields row */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">
                {t('common.sets', 'Sets')}
              </Label>
              <Input
                type="number"
                value={exercise.sets || ''}
                onChange={(e) => handleChange('sets', parseInt(e.target.value) || undefined)}
                className="h-8 text-sm"
                min={1}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {t('common.reps', 'Reps')}
              </Label>
              <Input
                value={exercise.reps || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange('reps', val.includes('-') ? val : (parseInt(val) || undefined));
                }}
                className="h-8 text-sm"
                placeholder="10 or 8-12"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {t('common.rest', 'Rest')} (s)
              </Label>
              <Input
                type="number"
                value={exercise.rest || ''}
                onChange={(e) => handleChange('rest', parseInt(e.target.value) || undefined)}
                className="h-8 text-sm"
                min={0}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {t('common.weight', 'Weight')}
              </Label>
              <Input
                type="number"
                value={exercise.weight || ''}
                onChange={(e) => handleChange('weight', parseFloat(e.target.value) || undefined)}
                className="h-8 text-sm"
                min={0}
              />
            </div>
          </div>
          
          {/* Advanced fields (coach mode) */}
          {viewMode === 'coach' && (
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2">
                  <Settings2 className="h-3 w-3" />
                  {t('eliteWorkout.advancedFields', 'Advanced')}
                  <ChevronDown className={cn(
                    'h-3 w-3 transition-transform',
                    showAdvanced && 'rotate-180'
                  )} />
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <AdvancedFieldsPanel 
                  exercise={exercise} 
                  onUpdate={onUpdate}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
        
        {/* Delete button */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
