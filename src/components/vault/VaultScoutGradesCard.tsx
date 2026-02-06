import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, ChevronDown, Lock, AlertCircle, TrendingUp, TrendingDown, Minus, BarChart3, Flame, Trophy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ScoutGrade {
  id: string;
  graded_at: string;
  next_prompt_date: string | null;
  grade_type: 'hitting_throwing' | 'pitching';
  // Hitting/Throwing grades
  hitting_grade: number | null;
  power_grade: number | null;
  speed_grade: number | null;
  defense_grade: number | null;
  throwing_grade: number | null;
  leadership_grade: number | null;
  self_efficacy_grade: number | null;
  // Pitching grades
  fastball_grade: number | null;
  offspeed_grade: number | null;
  breaking_ball_grade: number | null;
  control_grade: number | null;
  delivery_grade: number | null;
  rise_ball_grade: number | null;
  notes: string | null;
}

type GradeType = 'hitting_throwing' | 'pitching';

interface VaultScoutGradesCardProps {
  grades: ScoutGrade[];
  sport?: 'baseball' | 'softball';
  gradeType?: GradeType;
  autoOpen?: boolean;
  onSave: (data: {
    grade_type: GradeType;
    hitting_grade?: number | null;
    power_grade?: number | null;
    speed_grade?: number | null;
    defense_grade?: number | null;
    throwing_grade?: number | null;
    leadership_grade?: number | null;
    self_efficacy_grade?: number | null;
    fastball_grade?: number | null;
    offspeed_grade?: number | null;
    breaking_ball_grade?: number | null;
    control_grade?: number | null;
    delivery_grade?: number | null;
    rise_ball_grade?: number | null;
    notes: string | null;
  }) => Promise<{ success: boolean }>;
}

const LOCK_PERIOD_WEEKS = 12;

// Hitting/Throwing categories
const HITTING_THROWING_CATEGORIES = [
  'hitting',
  'power',
  'speed',
  'defense',
  'throwing',
  'leadership',
  'self_efficacy',
] as const;

// Pitching categories - baseball
const PITCHING_CATEGORIES_BASEBALL = [
  'fastball',
  'offspeed',
  'breaking_ball',
  'control',
  'delivery',
  'leadership',
  'self_efficacy',
] as const;

// Pitching categories - softball (includes rise ball)
const PITCHING_CATEGORIES_SOFTBALL = [
  'rise_ball',
  'fastball',
  'offspeed',
  'breaking_ball',
  'control',
  'delivery',
  'leadership',
  'self_efficacy',
] as const;

const gradeToLabel = (grade: number) => {
  if (grade >= 70) return 'elite';
  if (grade >= 60) return 'plus';
  if (grade >= 50) return 'average';
  if (grade >= 40) return 'below';
  return 'poor';
};

const getGradeValue = (grade: ScoutGrade, category: string): number | null => {
  switch (category) {
    case 'hitting': return grade.hitting_grade;
    case 'power': return grade.power_grade;
    case 'speed': return grade.speed_grade;
    case 'defense': return grade.defense_grade;
    case 'throwing': return grade.throwing_grade;
    case 'leadership': return grade.leadership_grade;
    case 'self_efficacy': return grade.self_efficacy_grade;
    case 'fastball': return grade.fastball_grade;
    case 'offspeed': return grade.offspeed_grade;
    case 'breaking_ball': return grade.breaking_ball_grade;
    case 'control': return grade.control_grade;
    case 'delivery': return grade.delivery_grade;
    case 'rise_ball': return grade.rise_ball_grade;
    default: return null;
  }
};

const getChangeIndicator = (change: number) => {
  if (change >= 5) return { icon: TrendingUp, color: 'text-green-500', bgColor: 'bg-green-500/10' };
  if (change <= -5) return { icon: TrendingDown, color: 'text-red-500', bgColor: 'bg-red-500/10' };
  return { icon: Minus, color: 'text-amber-500', bgColor: 'bg-amber-500/10' };
};

export function VaultScoutGradesCard({ 
  grades, 
  sport = 'baseball', 
  gradeType = 'hitting_throwing',
  autoOpen = false, 
  onSave 
}: VaultScoutGradesCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Get categories based on grade type and sport
  const categories = gradeType === 'pitching'
    ? (sport === 'softball' ? PITCHING_CATEGORIES_SOFTBALL : PITCHING_CATEGORIES_BASEBALL)
    : HITTING_THROWING_CATEGORIES;

  // Auto-open when navigating from Game Plan
  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
    }
  }, [autoOpen]);
  
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Initialize grade values
  const getInitialValues = () => {
    const values: Record<string, number[]> = {};
    categories.forEach(cat => {
      values[cat] = [50];
    });
    return values;
  };
  
  const [gradeValues, setGradeValues] = useState<Record<string, number[]>>(getInitialValues);
  const [notes, setNotes] = useState('');
  const [longTermGoals, setLongTermGoals] = useState('');

  const latestGrade = grades[0];
  const canGradeToday = !latestGrade || 
    !latestGrade.next_prompt_date || 
    new Date(latestGrade.next_prompt_date) <= new Date();

  const daysUntilNextGrade = latestGrade?.next_prompt_date 
    ? Math.max(0, Math.ceil((new Date(latestGrade.next_prompt_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Calculate progression data - show up to 4 most recent cycles
  const progressionData = grades.slice(0, 4).reverse();
  const hasProgression = progressionData.length >= 2;

  // Calculate total change (first vs last)
  const calculateTotalChange = (category: string): number => {
    if (progressionData.length < 2) return 0;
    const firstGrade = getGradeValue(progressionData[0], category);
    const lastGrade = getGradeValue(progressionData[progressionData.length - 1], category);
    if (firstGrade === null || lastGrade === null) return 0;
    return lastGrade - firstGrade;
  };

  useEffect(() => {
    if (latestGrade) {
      const newValues: Record<string, number[]> = {};
      categories.forEach(cat => {
        const value = getGradeValue(latestGrade, cat);
        newValues[cat] = [value || 50];
      });
      setGradeValues(newValues);
    }
  }, [latestGrade, categories]);

  const handleSave = async () => {
    setSaving(true);
    
    const gradeData: any = {
      grade_type: gradeType,
      notes: notes || null,
    };

    // Add values for the appropriate categories
    if (gradeType === 'hitting_throwing') {
      gradeData.hitting_grade = gradeValues.hitting?.[0] ?? null;
      gradeData.power_grade = gradeValues.power?.[0] ?? null;
      gradeData.speed_grade = gradeValues.speed?.[0] ?? null;
      gradeData.defense_grade = gradeValues.defense?.[0] ?? null;
      gradeData.throwing_grade = gradeValues.throwing?.[0] ?? null;
      gradeData.leadership_grade = gradeValues.leadership?.[0] ?? null;
      gradeData.self_efficacy_grade = gradeValues.self_efficacy?.[0] ?? null;
    } else {
      gradeData.fastball_grade = gradeValues.fastball?.[0] ?? null;
      gradeData.offspeed_grade = gradeValues.offspeed?.[0] ?? null;
      gradeData.breaking_ball_grade = gradeValues.breaking_ball?.[0] ?? null;
      gradeData.control_grade = gradeValues.control?.[0] ?? null;
      gradeData.delivery_grade = gradeValues.delivery?.[0] ?? null;
      gradeData.rise_ball_grade = gradeValues.rise_ball?.[0] ?? null;
      gradeData.leadership_grade = gradeValues.leadership?.[0] ?? null;
      gradeData.self_efficacy_grade = gradeValues.self_efficacy?.[0] ?? null;
    }

    await onSave(gradeData);
    setNotes('');
    setSaving(false);
  };

  const title = gradeType === 'pitching' 
    ? t('vault.scoutGrades.pitchingTitle') 
    : t('vault.scoutGrades.title');
  
  const description = gradeType === 'pitching'
    ? t('vault.scoutGrades.pitchingDescription')
    : t('vault.scoutGrades.description');

  const CardIcon = gradeType === 'pitching' ? Flame : Star;
  const iconColor = gradeType === 'pitching' ? 'text-orange-500' : 'text-yellow-500';

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardIcon className={`h-5 w-5 ${iconColor}`} />
                <CardTitle className="text-lg">{title}</CardTitle>
                {grades.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{grades.length}</Badge>
                )}
                {!canGradeToday && (
                  <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-600">
                    <Lock className="h-3 w-3" />
                    {t('vault.lockPeriod.locked')}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Lock Period Info */}
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {t('vault.lockPeriod.twelveWeeks')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('vault.lockPeriod.entriesImmutable')}
                </p>
              </AlertDescription>
            </Alert>

            {/* Grade Progression Chart */}
            {hasProgression && (
              <Collapsible open={progressionOpen} onOpenChange={setProgressionOpen}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span className="font-medium text-sm">{t('vault.scoutGrades.progression.title')}</span>
                      <Badge variant="outline" className="text-xs">
                        {progressionData.length} {t('vault.scoutGrades.progression.cycles')}
                      </Badge>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${progressionOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 rounded-lg border border-border overflow-hidden">
                    <ScrollArea className="max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[120px] text-xs">{t('vault.scoutGrades.progression.category')}</TableHead>
                            {progressionData.map((grade, idx) => (
                              <TableHead key={grade.id} className="text-center text-xs">
                                <div className="flex flex-col items-center">
                                  <span>{t('vault.scoutGrades.progression.cycle')} {idx + 1}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(grade.graded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="text-center text-xs w-[80px]">{t('vault.scoutGrades.progression.change')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categories.map((category) => {
                            const totalChange = calculateTotalChange(category);
                            const { icon: Icon, color, bgColor } = getChangeIndicator(totalChange);
                            return (
                              <TableRow key={category}>
                                <TableCell className="font-medium text-xs">
                                  {t(`vault.scoutGrades.categories.${category}`)}
                                </TableCell>
                                {progressionData.map((grade) => {
                                  const value = getGradeValue(grade, category);
                                  return (
                                    <TableCell key={grade.id} className="text-center">
                                      <span className={`text-sm font-medium ${
                                        value && value >= 70 ? 'text-green-500' :
                                        value && value >= 50 ? 'text-amber-500' :
                                        'text-red-500'
                                      }`}>
                                        {value || '-'}
                                      </span>
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center">
                                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${bgColor}`}>
                                    <Icon className={`h-3 w-3 ${color}`} />
                                    <span className={`text-xs font-medium ${color}`}>
                                      {totalChange > 0 ? '+' : ''}{totalChange}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {!canGradeToday ? (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">{t('vault.lockPeriod.sectionLocked')}</span>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {t('vault.lockPeriod.lockedUntil', { days: daysUntilNextGrade })}
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2">
                  <CardIcon className={`h-4 w-4 ${gradeType === 'pitching' ? 'text-orange-500' : 'text-green-500'}`} />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {t('vault.lockPeriod.readyToRecord')}
                  </span>
                </div>

                {/* Simplified Scale Reference */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-red-500/10 via-amber-500/10 to-green-500/10 border border-border mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{t('vault.scoutGrades.scaleReference.title')}</span>
                  </div>
                  
                  {/* Visual scale bar */}
                  <div className="relative h-3 rounded-full bg-gradient-to-r from-red-500/40 via-amber-500/40 to-green-500/40 mb-2">
                    {/* 45 marker - the important reference point */}
                    <div 
                      className="absolute top-0 h-full w-0.5 bg-primary"
                      style={{ left: `${((45 - 20) / 60) * 100}%` }}
                    />
                  </div>
                  
                  {/* Simple labels */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-red-500 font-medium">20</span>
                    <div className="flex flex-col items-center">
                      <span className="text-primary font-bold text-sm">45</span>
                      <span className="text-primary text-[10px]">
                        {sport === 'softball' ? 'AUSL Avg' : 'MLB Avg'}
                      </span>
                    </div>
                    <span className="text-green-500 font-medium">80</span>
                  </div>
                </div>

                {categories.map((category) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{t(`vault.scoutGrades.categories.${category}`)}</Label>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          (gradeValues[category]?.[0] || 50) >= 70 ? 'text-green-500 border-green-500' :
                          (gradeValues[category]?.[0] || 50) >= 50 ? 'text-amber-500 border-amber-500' :
                          'text-red-500 border-red-500'
                        }`}
                      >
                        {gradeValues[category]?.[0] || 50} - {t(`vault.scoutGrades.levels.${gradeToLabel(gradeValues[category]?.[0] || 50)}`)}
                      </Badge>
                    </div>
                    <Slider
                      value={gradeValues[category] || [50]}
                      onValueChange={(val) => setGradeValues({ ...gradeValues, [category]: val })}
                      min={20}
                      max={80}
                      step={5}
                      className="py-1"
                    />
                    {/* Tick marks showing 5-point increments */}
                    <div className="relative h-6 px-1">
                      {[20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80].map((tick) => {
                        const position = ((tick - 20) / 60) * 100;
                        const isCurrentValue = (gradeValues[category]?.[0] || 50) === tick;
                        const is45 = tick === 45;
                        const isMajor = [20, 30, 40, 45, 50, 60, 70, 80].includes(tick);
                        return (
                          <div
                            key={tick}
                            className="absolute flex flex-col items-center"
                            style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                          >
                            <div className={`w-px ${isMajor ? 'h-2' : 'h-1'} ${is45 ? 'bg-primary' : isCurrentValue ? 'bg-primary' : isMajor ? 'bg-muted-foreground/60' : 'bg-muted-foreground/30'}`} />
                            {isMajor && (
                              <span className={`text-[8px] leading-tight ${is45 ? 'text-primary font-bold' : isCurrentValue ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                {tick}
                              </span>
                            )}
                            {is45 && (
                              <span className="text-[7px] text-primary font-semibold leading-none">
                                {sport === 'softball' ? 'AUSL' : 'MLB'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Notes */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-sm">{t('vault.scoutGrades.notes')}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('vault.scoutGrades.notesPlaceholder')}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Long-Term Goals (3 Years) */}
                <div className="space-y-2 pt-3 border-t border-border">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    {t('vault.scoutGrades.longTermGoals')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('vault.scoutGrades.longTermGoalsDescription')}
                  </p>
                  <Textarea
                    value={longTermGoals}
                    onChange={(e) => setLongTermGoals(e.target.value)}
                    placeholder={t('vault.scoutGrades.longTermGoalsPlaceholder')}
                    rows={4}
                    maxLength={1000}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{longTermGoals.length}/1000</p>
                </div>

                {/* Save Button */}
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? t('common.loading') : t('vault.scoutGrades.save')}
                </Button>
              </div>
            )}

            {/* Previous Grades */}
            {grades.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-sm font-medium text-muted-foreground">{t('vault.scoutGrades.history')}</h4>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {grades.map((grade) => (
                      <div key={grade.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(grade.graded_at).toLocaleDateString(undefined, { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {categories.slice(0, 4).map((cat) => {
                            const value = getGradeValue(grade, cat);
                            return value ? (
                              <Badge key={cat} variant="outline" className="text-[10px]">
                                {t(`vault.scoutGrades.categories.${cat}`)}: {value}
                              </Badge>
                            ) : null;
                          })}
                          {categories.length > 4 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{categories.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}