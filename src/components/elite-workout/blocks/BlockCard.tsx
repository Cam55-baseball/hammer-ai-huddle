import { useState } from 'react';
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
  GripVertical, ChevronDown, ChevronUp, Trash2, Plus, Pencil, Check, X,
  Flame, Zap, Target, Dumbbell, Rocket, Battery, Wind, Moon
} from 'lucide-react';
import { EnhancedExerciseCard } from '../exercises/EnhancedExerciseCard';

interface BlockCardProps {
  block: WorkoutBlock;
  viewMode: ViewMode;
  onUpdate: (block: WorkoutBlock) => void;
  onDelete: () => void;
  onAddExercise: () => void;
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

export function BlockCard({ block, viewMode, onUpdate, onDelete, onAddExercise }: BlockCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(block.name);
  
  const config = BLOCK_TYPE_CONFIGS[block.blockType];
  const Icon = BLOCK_ICONS[block.blockType] || Target;
  const cnsLoad = calculateBlockCNS(block);
  const cnsFormat = formatCNSLoad(cnsLoad);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const handleSaveName = () => {
    onUpdate({ ...block, name: editName });
    setIsEditing(false);
  };
  
  const handleCancelEdit = () => {
    setEditName(block.name);
    setIsEditing(false);
  };
  
  const handleExerciseUpdate = (index: number, exercise: EnhancedExercise) => {
    const newExercises = [...block.exercises];
    newExercises[index] = exercise;
    onUpdate({ ...block, exercises: newExercises });
  };
  
  const handleExerciseDelete = (index: number) => {
    const newExercises = block.exercises.filter((_, i) => i !== index);
    onUpdate({ ...block, exercises: newExercises });
  };
  
  // Execute mode: simplified view
  if (viewMode === 'execute') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'rounded-xl border-2 overflow-hidden transition-all',
          config.color,
          isDragging && 'opacity-50 scale-[1.02] shadow-xl'
        )}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-background/50 transition-colors">
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="font-bold text-lg flex-1">{block.name}</span>
              <Badge variant="secondary" className="text-xs">
                {block.exercises.length} {t('common.exercises', 'exercises')}
              </Badge>
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {block.exercises.map((exercise, index) => (
                <div 
                  key={exercise.id}
                  className="flex items-center gap-3 p-3 bg-background/80 rounded-lg"
                >
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{exercise.name}</p>
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
                <p className="text-center text-muted-foreground py-4">
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
        isDragging && 'opacity-50 scale-[1.02] shadow-xl'
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-border/50">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          
          {/* Icon */}
          <Icon className="h-5 w-5 flex-shrink-0" />
          
          {/* Name */}
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveName}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button 
              className="flex-1 text-left font-semibold hover:text-primary transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {block.name}
            </button>
          )}
          
          {/* CNS Badge (Coach mode only) */}
          {viewMode === 'coach' && cnsLoad > 0 && (
            <Badge variant="outline" className={cn('text-xs', cnsFormat.color)}>
              CNS: {cnsLoad}
            </Badge>
          )}
          
          {/* Exercise count */}
          <Badge variant="secondary" className="text-xs">
            {block.exercises.length}
          </Badge>
          
          {/* Actions */}
          <CollapsibleTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <CollapsibleContent>
          <div className="p-3 space-y-2">
            {block.exercises.map((exercise, index) => (
              <EnhancedExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                viewMode={viewMode}
                onUpdate={(updated) => handleExerciseUpdate(index, updated)}
                onDelete={() => handleExerciseDelete(index)}
              />
            ))}
            
            {/* Add Exercise Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-dashed"
              onClick={onAddExercise}
            >
              <Plus className="h-4 w-4" />
              {t('eliteWorkout.addExercise', 'Add Exercise')}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
