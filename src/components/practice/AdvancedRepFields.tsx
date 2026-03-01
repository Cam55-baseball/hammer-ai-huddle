import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';

export interface AdvancedFields {
  in_zone?: boolean;
  batted_ball_type?: string;
  spin_direction?: string;
  swing_intent?: string;
  execution_score?: number;
  machine_velocity_band?: string;
  bp_distance_ft?: number;
  velocity_band?: string;
  spin_efficiency_pct?: number;
  pitch_command_grade?: number;
  throw_included?: boolean;
  footwork_grade?: number;
  exchange_time_band?: string;
  throw_accuracy?: number;
  throw_spin_quality?: string;
}

interface AdvancedRepFieldsProps {
  module: string;
  drillType?: string;
  value: AdvancedFields;
  onChange: (fields: AdvancedFields) => void;
}

const STORAGE_KEY_PREFIX = 'lastSession_';

function getSmartDefaults(module: string, drillType?: string): AdvancedFields {
  const key = `${STORAGE_KEY_PREFIX}${module}_${drillType || 'default'}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

export function saveSessionDefaults(module: string, drillType: string | undefined, fields: AdvancedFields) {
  const key = `${STORAGE_KEY_PREFIX}${module}_${drillType || 'default'}`;
  try {
    localStorage.setItem(key, JSON.stringify(fields));
  } catch {}
}

const SelectGrid = ({ options, value, onChange, cols = 3 }: {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
  cols?: number;
}) => (
  <div className={cn('grid gap-1.5', cols === 4 ? 'grid-cols-4' : cols === 5 ? 'grid-cols-5' : 'grid-cols-3')}>
    {options.map(opt => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={cn(
          'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all',
          value === opt.value
            ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
            : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export function AdvancedRepFields({ module, drillType, value, onChange }: AdvancedRepFieldsProps) {
  const [open, setOpen] = useState(false);

  // Load smart defaults on mount
  useEffect(() => {
    if (Object.keys(value).length === 0) {
      const defaults = getSmartDefaults(module, drillType);
      if (Object.keys(defaults).length > 0) onChange(defaults);
    }
  }, [module, drillType]);

  const update = (field: keyof AdvancedFields, val: any) => {
    onChange({ ...value, [field]: val });
  };

  const isHitting = module === 'hitting';
  const isPitching = module === 'pitching';
  const isFielding = module === 'fielding';
  const isMachineBP = drillType === 'machine_bp';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1"
        >
          <Settings2 className="h-3 w-3" />
          {open ? 'Hide' : 'Show'} Advanced Fields
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 pt-2 pb-1 px-1"
        >
          {/* In-zone toggle (hitting + pitching) */}
          {(isHitting || isPitching) && (
            <div className="flex items-center justify-between">
              <Label className="text-xs">In Zone?</Label>
              <Switch
                checked={value.in_zone ?? false}
                onCheckedChange={v => update('in_zone', v)}
              />
            </div>
          )}

          {/* Hitting fields */}
          {isHitting && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Batted Ball Type</Label>
                <SelectGrid
                  options={[
                    { value: 'ground', label: 'Ground' },
                    { value: 'line', label: 'Line' },
                    { value: 'fly', label: 'Fly' },
                    { value: 'barrel', label: 'Barrel' },
                  ]}
                  value={value.batted_ball_type}
                  onChange={v => update('batted_ball_type', v)}
                  cols={4}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Spin Direction</Label>
                <SelectGrid
                  options={[
                    { value: 'topspin', label: 'Top' },
                    { value: 'backspin', label: 'Back' },
                    { value: 'sidespin', label: 'Side' },
                  ]}
                  value={value.spin_direction}
                  onChange={v => update('spin_direction', v)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Swing Intent</Label>
                <SelectGrid
                  options={[
                    { value: 'mechanical', label: 'Mech' },
                    { value: 'game_intent', label: 'Game' },
                    { value: 'situational', label: 'Situ' },
                    { value: 'hr_derby', label: 'HR' },
                  ]}
                  value={value.swing_intent}
                  onChange={v => update('swing_intent', v)}
                  cols={4}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Execution Score: {value.execution_score ?? 5}
                </Label>
                <Slider
                  min={1} max={10} step={1}
                  value={[value.execution_score ?? 5]}
                  onValueChange={([v]) => update('execution_score', v)}
                />
              </div>

              {/* Machine BP specific */}
              {isMachineBP && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Machine Velocity Band</Label>
                    <SelectGrid
                      options={[
                        { value: '40-50', label: '40-50' },
                        { value: '50-60', label: '50-60' },
                        { value: '60-70', label: '60-70' },
                        { value: '70-80', label: '70-80' },
                        { value: '80+', label: '80+' },
                      ]}
                      value={value.machine_velocity_band}
                      onChange={v => update('machine_velocity_band', v)}
                      cols={5}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">BP Distance (ft)</Label>
                    <Input
                      type="number"
                      placeholder="60"
                      value={value.bp_distance_ft ?? ''}
                      onChange={e => update('bp_distance_ft', e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Pitching fields */}
          {isPitching && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Velocity Band</Label>
                <SelectGrid
                  options={[
                    { value: '60-70', label: '60-70' },
                    { value: '70-80', label: '70-80' },
                    { value: '80-90', label: '80-90' },
                    { value: '90+', label: '90+' },
                  ]}
                  value={value.velocity_band}
                  onChange={v => update('velocity_band', v)}
                  cols={4}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Spin Efficiency: {value.spin_efficiency_pct ?? 50}%
                </Label>
                <Slider
                  min={0} max={100} step={1}
                  value={[value.spin_efficiency_pct ?? 50]}
                  onValueChange={([v]) => update('spin_efficiency_pct', v)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Command Grade: {value.pitch_command_grade ?? 50}
                </Label>
                <Slider
                  min={20} max={80} step={5}
                  value={[value.pitch_command_grade ?? 50]}
                  onValueChange={([v]) => update('pitch_command_grade', v)}
                />
              </div>
            </>
          )}

          {/* Fielding fields */}
          {isFielding && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Throw Included?</Label>
                <Switch
                  checked={value.throw_included ?? false}
                  onCheckedChange={v => update('throw_included', v)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Footwork Grade: {value.footwork_grade ?? 50}
                </Label>
                <Slider
                  min={20} max={80} step={5}
                  value={[value.footwork_grade ?? 50]}
                  onValueChange={([v]) => update('footwork_grade', v)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Exchange Time</Label>
                <SelectGrid
                  options={[
                    { value: 'fast', label: 'Fast' },
                    { value: 'average', label: 'Avg' },
                    { value: 'slow', label: 'Slow' },
                  ]}
                  value={value.exchange_time_band}
                  onChange={v => update('exchange_time_band', v)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Throw Accuracy: {value.throw_accuracy ?? 50}
                </Label>
                <Slider
                  min={20} max={80} step={5}
                  value={[value.throw_accuracy ?? 50]}
                  onValueChange={([v]) => update('throw_accuracy', v)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Throw Spin Quality</Label>
                <SelectGrid
                  options={[
                    { value: 'carry', label: 'Carry' },
                    { value: 'tail', label: 'Tail' },
                    { value: 'cut', label: 'Cut' },
                    { value: 'neutral', label: 'Neutral' },
                  ]}
                  value={value.throw_spin_quality}
                  onChange={v => update('throw_spin_quality', v)}
                  cols={4}
                />
              </div>
            </>
          )}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}
