import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  RunningSession, 
  RunType, 
  RunIntent, 
  RUN_TYPE_CONFIGS,
  SurfaceType,
  ShoeType,
  FatigueState,
  createEmptyRunningSession 
} from '@/types/eliteWorkout';
import { calculateRunningCNS, formatCNSLoad } from '@/utils/loadCalculation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, Timer, Heart, ArrowUp, TrendingUp, RotateCcw, Shuffle, Footprints,
  ChevronDown, Settings2, Plus, Trash2
} from 'lucide-react';
import { CNSLoadBadge } from '../intelligence/CNSLoadIndicator';

interface RunningCardBuilderProps {
  session: RunningSession;
  onChange: (session: RunningSession) => void;
  onDelete?: () => void;
  showCNS?: boolean;
  className?: string;
}

const RUN_TYPE_ICONS: Record<RunType, React.ComponentType<{ className?: string }>> = {
  linear_sprint: Zap,
  tempo: Timer,
  conditioning: Heart,
  elastic: ArrowUp,
  accel_decel: TrendingUp,
  curve: RotateCcw,
  cod: Shuffle,
  gait: Footprints,
};

export function RunningCardBuilder({ 
  session, 
  onChange, 
  onDelete,
  showCNS = true,
  className 
}: RunningCardBuilderProps) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const config = RUN_TYPE_CONFIGS[session.runType];
  const cnsLoad = calculateRunningCNS(session);
  const cnsFormat = formatCNSLoad(cnsLoad);
  
  const handleChange = <K extends keyof RunningSession>(field: K, value: RunningSession[K]) => {
    onChange({ ...session, [field]: value });
  };
  
  return (
    <div className={cn(
      'rounded-xl border-2 overflow-hidden',
      config.color,
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        {/* Run Type Icon */}
        {(() => {
          const Icon = RUN_TYPE_ICONS[session.runType];
          return <Icon className="h-6 w-6" />;
        })()}
        
        <div className="flex-1">
          <Input
            value={session.title || ''}
            onChange={(e) => handleChange('title', e.target.value || undefined)}
            className="h-8 text-sm font-medium bg-transparent border-none px-0 focus-visible:ring-0"
            placeholder={t('eliteWorkout.running.sessionTitle', 'Running Session')}
          />
        </div>
        
        {showCNS && <CNSLoadBadge load={cnsLoad} />}
        
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Core Fields */}
      <div className="p-4 space-y-4">
        {/* Run Type & Intent */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">
              {t('eliteWorkout.running.type', 'Run Type')}
            </Label>
            <Select
              value={session.runType}
              onValueChange={(value) => handleChange('runType', value as RunType)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(RUN_TYPE_CONFIGS).map((cfg) => {
                  const Icon = RUN_TYPE_ICONS[cfg.type];
                  return (
                    <SelectItem key={cfg.type} value={cfg.type}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{t(`eliteWorkout.running.types.${cfg.type}`, cfg.label)}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">
              {t('eliteWorkout.running.intent', 'Intent')}
            </Label>
            <Select
              value={session.intent}
              onValueChange={(value) => handleChange('intent', value as RunIntent)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="max">{t('eliteWorkout.intent.max', 'Max')}</SelectItem>
                <SelectItem value="submax">{t('eliteWorkout.intent.submax', 'Submax')}</SelectItem>
                <SelectItem value="elastic">{t('eliteWorkout.intent.elastic', 'Elastic')}</SelectItem>
                <SelectItem value="technical">{t('eliteWorkout.intent.technical', 'Technical')}</SelectItem>
                <SelectItem value="recovery">{t('eliteWorkout.intent.recovery', 'Recovery')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Distance/Time/Reps */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">
              {t('eliteWorkout.running.distance', 'Distance')}
            </Label>
            <Input
              type="number"
              value={session.distanceValue || ''}
              onChange={(e) => handleChange('distanceValue', parseFloat(e.target.value) || undefined)}
              className="h-9"
              min={0}
            />
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">
              {t('common.unit', 'Unit')}
            </Label>
            <Select
              value={session.distanceUnit || 'yards'}
              onValueChange={(value) => handleChange('distanceUnit', value as RunningSession['distanceUnit'])}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yards">{t('units.yards', 'Yards')}</SelectItem>
                <SelectItem value="meters">{t('units.meters', 'Meters')}</SelectItem>
                <SelectItem value="feet">{t('units.feet', 'Feet')}</SelectItem>
                <SelectItem value="miles">{t('units.miles', 'Miles')}</SelectItem>
                <SelectItem value="km">{t('units.km', 'Kilometers')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">
              {t('common.reps', 'Reps')}
            </Label>
            <Input
              type="number"
              value={session.reps || ''}
              onChange={(e) => handleChange('reps', parseInt(e.target.value) || undefined)}
              className="h-9"
              min={1}
            />
          </div>
        </div>
        
        {/* Time Goal */}
        <div>
          <Label className="text-xs text-muted-foreground">
            {t('eliteWorkout.running.timeGoal', 'Time Goal')} (optional)
          </Label>
          <Input
            value={session.timeGoal || ''}
            onChange={(e) => handleChange('timeGoal', e.target.value || undefined)}
            className="h-9"
            placeholder="0:00.0"
          />
        </div>
        
        {/* Advanced Context Fields */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 w-full justify-start">
              <Settings2 className="h-3.5 w-3.5" />
              {t('eliteWorkout.contextToggles', 'Context Toggles')}
              <ChevronDown className={cn(
                'h-3.5 w-3.5 ml-auto transition-transform',
                showAdvanced && 'rotate-180'
              )} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 pt-3">
            {/* Surface & Shoes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t('eliteWorkout.running.surface', 'Surface')}
                </Label>
                <Select
                  value={session.surface || ''}
                  onValueChange={(value) => handleChange('surface', value as SurfaceType || undefined)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('common.select', 'Select...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="turf">{t('eliteWorkout.surfaces.turf', 'Turf')}</SelectItem>
                    <SelectItem value="grass">{t('eliteWorkout.surfaces.grass', 'Grass')}</SelectItem>
                    <SelectItem value="dirt">{t('eliteWorkout.surfaces.dirt', 'Dirt')}</SelectItem>
                    <SelectItem value="concrete">{t('eliteWorkout.surfaces.concrete', 'Concrete')}</SelectItem>
                    <SelectItem value="sand">{t('eliteWorkout.surfaces.sand', 'Sand')}</SelectItem>
                    <SelectItem value="track">{t('eliteWorkout.surfaces.track', 'Track')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t('eliteWorkout.running.shoes', 'Shoes')}
                </Label>
                <Select
                  value={session.shoeType || ''}
                  onValueChange={(value) => handleChange('shoeType', value as ShoeType || undefined)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('common.select', 'Select...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barefoot">{t('eliteWorkout.shoes.barefoot', 'Barefoot')}</SelectItem>
                    <SelectItem value="barefoot_shoe">{t('eliteWorkout.shoes.barefoot_shoe', 'Barefoot Shoe')}</SelectItem>
                    <SelectItem value="flats">{t('eliteWorkout.shoes.flats', 'Flats')}</SelectItem>
                    <SelectItem value="cross_trainer">{t('eliteWorkout.shoes.cross_trainer', 'Cross Trainer')}</SelectItem>
                    <SelectItem value="cushion">{t('eliteWorkout.shoes.cushion', 'Cushion')}</SelectItem>
                    <SelectItem value="plastic_cleat">{t('eliteWorkout.shoes.plastic_cleat', 'Plastic Cleat')}</SelectItem>
                    <SelectItem value="metal_cleat">{t('eliteWorkout.shoes.metal_cleat', 'Metal Cleat')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Fatigue State & Stiffness */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t('eliteWorkout.running.fatigueState', 'Fatigue State')}
                </Label>
                <Select
                  value={session.fatigueState || 'fresh'}
                  onValueChange={(value) => handleChange('fatigueState', value as FatigueState)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresh">{t('eliteWorkout.fatigue.fresh', 'Fresh')}</SelectItem>
                    <SelectItem value="accumulated">{t('eliteWorkout.fatigue.accumulated', 'Accumulated')}</SelectItem>
                    <SelectItem value="game_day">{t('eliteWorkout.fatigue.game_day', 'Game Day')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t('eliteWorkout.running.contacts', 'Ground Contacts')}
                </Label>
                <Input
                  type="number"
                  value={session.contacts || ''}
                  onChange={(e) => handleChange('contacts', parseInt(e.target.value) || undefined)}
                  className="h-9"
                  min={0}
                />
              </div>
            </div>
            
            {/* Notes */}
            <div>
              <Label className="text-xs text-muted-foreground">
                {t('common.notes', 'Notes')}
              </Label>
              <Textarea
                value={session.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value || undefined)}
                className="min-h-[60px] text-sm"
                placeholder={t('eliteWorkout.running.notesPlaceholder', 'Environment, cues, focus...')}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

interface AddRunningSessionButtonProps {
  onAdd: (session: RunningSession) => void;
  className?: string;
}

export function AddRunningSessionButton({ onAdd, className }: AddRunningSessionButtonProps) {
  const { t } = useTranslation();
  
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('gap-2', className)}
      onClick={() => onAdd(createEmptyRunningSession())}
    >
      <Footprints className="h-4 w-4" />
      {t('eliteWorkout.running.addSession', 'Add Running Session')}
    </Button>
  );
}
