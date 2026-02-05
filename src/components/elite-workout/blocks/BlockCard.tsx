import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { WorkoutBlock, ViewMode, BLOCK_TYPE_CONFIGS, EnhancedExercise } from '@/types/eliteWorkout';
import { calculateBlockCNS, formatCNSLoad } from '@/utils/loadCalculation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  GripVertical, ChevronDown, ChevronUp, Trash2, Plus, Check, X,
  Flame, Zap, Target, Dumbbell, Rocket, Battery, Wind, Moon
} from 'lucide-react';
import { EnhancedExerciseCard } from '../exercises/EnhancedExerciseCard';

interface BlockCardProps {
  block: WorkoutBlock;
  viewMode: ViewMode;
  onUpdate: (block: WorkoutBlock) => void;
  onDelete: () => void;
  onAddExercise: () => void;
  isLocked?: boolean;
}

const BLOCK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  activation: Flame,
  elastic_prep: Zap,
  cns_primer: Zap,
  strength_output: Dumbbell,
  power_speed: Rocket,
  capacity: Battery,
  skill_transfer: Target,
  decompression: Wind,
  recovery: Moon,
  custom: Target,
};

export function BlockCard({ 
  block, 
  viewMode, 
  onUpdate, 
  onDelete, 
  onAddExercise,
  isLocked = false,
}: BlockCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(block.name);
  
  const config = BLOCK_TYPE_CONFIGS[block.blockType];
  const Icon = BLOCK_ICONS[block.blockType] || Target;
  
  // Memoize expensive calculations
  const cnsLoad = useMemo(() => calculateBlockCNS(block), [block]);
  const cnsFormat = useMemo(() => formatCNSLoad(cnsLoad), [cnsLoad]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: isLocked });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // Memoized handlers to prevent unnecessary re-renders
  const handleSaveName = useCallback(() => {
    onUpdate({ ...block, name: editName });
    setIsEditing(false);
  }, [block, editName, onUpdate]);
  
  const handleCancelEdit = useCallback(() => {
    setEditName(block.name);
    setIsEditing(false);
  }, [block.name]);
  
  const handleExerciseUpdate = useCallback((index: number, exercise: EnhancedExercise) => {
    const newExercises = [...block.exercises];
    newExercises[index] = exercise;
    onUpdate({ ...block, exercises: newExercises });
  }, [block, onUpdate]);
  
  const handleExerciseDelete = useCallback((index: number) => {
    const newExercises = block.exercises.filter((_, i) => i !== index);
    onUpdate({ ...block, exercises: newExercises });
  }, [block, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') handleCancelEdit();
  }, [handleSaveName, handleCancelEdit]);
  
  // Execute mode: simplified view
  if (viewMode === 'execute') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'rounded-xl border-2 overflow-hidden transition-all',
          config.color,
          isDragging && 'opacity-50 scale-[1.02] shadow-xl',
          isLocked && 'pointer-events-none opacity-75'
        )}
        role="region"
        aria-label={t('eliteWorkout.blocks.blockLabel', { name: block.name })}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button 
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-background/50 transition-colors min-h-[56px]"
              aria-expanded={isOpen}
              aria-controls={`block-content-${block.id}`}
            >
              <Icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
              <span className="font-bold text-lg flex-1 truncate">{block.name}</span>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {block.exercises.length} {t('common.exercises', 'exercises')}
              </Badge>
              {isOpen ? <ChevronUp className="h-5 w-5 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 flex-shrink-0" />}
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent id={`block-content-${block.id}`}>
            <div className="px-4 pb-4 space-y-2">
              {block.exercises.map((exercise, index) => (
                <div 
                  key={exercise.id}
                  className="flex items-center gap-3 p-3 bg-background/80 rounded-lg"
                  role="listitem"
                >
                  <span className="text-lg font-bold text-muted-foreground w-6 flex-shrink-0" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{exercise.name || t('eliteWorkout.unnamedExercise', 'Unnamed Exercise')}</p>
                    {exercise.sets && exercise.reps && (
                      <p className="text-sm text-muted-foreground">
                        {exercise.sets} × {exercise.reps}
                        {exercise.rest && ` • ${exercise.rest}s rest`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {block.exercises.length === 0 && (
                <p className="text-center text-muted-foreground py-4" role="status">
                  {t('eliteWorkout.noExercises', 'No exercises yet')}
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }
  
  // Coach/Parent mode: full controls
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border-2 overflow-hidden transition-all',
        config.color,
        isDragging && 'opacity-50 scale-[1.02] shadow-xl',
        isLocked && 'pointer-events-none opacity-75'
      )}
      role="region"
      aria-label={t('eliteWorkout.blocks.blockLabel', { name: block.name })}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-border/50">
          {/* Drag Handle - 44x44 touch target */}
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "p-2 cursor-grab active:cursor-grabbing touch-none rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center",
              "hover:bg-background/50 transition-colors",
              isLocked && "cursor-not-allowed opacity-50"
            )}
            aria-label={t('eliteWorkout.dragBlock', 'Drag to reorder block')}
            disabled={isLocked}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </button>
          
          {/* Icon */}
          <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          
          {/* Name */}
          {isEditing && !isLocked ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={handleKeyDown}
                aria-label={t('eliteWorkout.blockName', 'Block name')}
              />
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-10 w-10 flex-shrink-0" 
                onClick={handleSaveName}
                aria-label={t('common.save', 'Save')}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-10 w-10 flex-shrink-0" 
                onClick={handleCancelEdit}
                aria-label={t('common.cancel', 'Cancel')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button 
              className={cn(
                "flex-1 text-left font-semibold hover:text-primary transition-colors truncate min-w-0",
                isLocked && "pointer-events-none"
              )}
              onClick={() => !isLocked && setIsEditing(true)}
              aria-label={t('eliteWorkout.editBlockName', 'Click to edit block name')}
              disabled={isLocked}
            >
              {block.name}
            </button>
          )}
          
          {/* CNS Badge (Coach mode only) */}
          {viewMode === 'coach' && cnsLoad > 0 && (
            <Badge 
              variant="outline" 
              className={cn('text-xs flex-shrink-0', cnsFormat.color)}
              aria-label={t('eliteWorkout.cnsLoad', 'CNS Load: {{load}}', { load: cnsLoad })}
            >
              CNS: {cnsLoad}
            </Badge>
          )}
          
          {/* Exercise count */}
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {block.exercises.length}
          </Badge>
          
          {/* Actions */}
          <CollapsibleTrigger asChild>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-10 w-10 flex-shrink-0"
              aria-label={isOpen ? t('common.collapse', 'Collapse') : t('common.expand', 'Expand')}
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          {!isLocked && (
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-10 w-10 flex-shrink-0 text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label={t('eliteWorkout.deleteBlock', 'Delete block')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Content */}
        <CollapsibleContent id={`block-content-${block.id}`}>
          <div className="p-3 space-y-2" role="list" aria-label={t('eliteWorkout.exercisesList', 'Exercises')}>
            {block.exercises.map((exercise, index) => (
              <EnhancedExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                viewMode={viewMode}
                onUpdate={(updated) => handleExerciseUpdate(index, updated)}
                onDelete={() => handleExerciseDelete(index)}
                isLocked={isLocked}
              />
            ))}
            
            {/* Add Exercise Button */}
            {!isLocked && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed min-h-[44px]"
                onClick={onAddExercise}
                aria-label={t('eliteWorkout.addExercise', 'Add Exercise')}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('eliteWorkout.addExercise', 'Add Exercise')}
              </Button>
            )}
            
            {block.exercises.length === 0 && (
              <p className="text-center text-muted-foreground py-2 text-sm" role="status">
                {t('eliteWorkout.noExercisesHint', 'Add exercises to this block')}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
