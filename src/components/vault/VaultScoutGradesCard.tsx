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
import { Star, ChevronDown, Lock, AlertCircle, Calendar, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
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
  hitting_grade: number | null;
  power_grade: number | null;
  speed_grade: number | null;
  defense_grade: number | null;
  throwing_grade: number | null;
  leadership_grade: number | null;
  self_efficacy_grade: number | null;
  notes: string | null;
}

interface VaultScoutGradesCardProps {
  grades: ScoutGrade[];
  onSave: (data: {
    hitting_grade: number | null;
    power_grade: number | null;
    speed_grade: number | null;
    defense_grade: number | null;
    throwing_grade: number | null;
    leadership_grade: number | null;
    self_efficacy_grade: number | null;
    notes: string | null;
  }) => Promise<{ success: boolean }>;
}

const LOCK_PERIOD_WEEKS = 12;

const GRADE_CATEGORIES = [
  'hitting',
  'power',
  'speed',
  'defense',
  'throwing',
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
    default: return null;
  }
};

const getChangeIndicator = (change: number) => {
  if (change >= 5) return { icon: TrendingUp, color: 'text-green-500', bgColor: 'bg-green-500/10' };
  if (change <= -5) return { icon: TrendingDown, color: 'text-red-500', bgColor: 'bg-red-500/10' };
  return { icon: Minus, color: 'text-amber-500', bgColor: 'bg-amber-500/10' };
};

export function VaultScoutGradesCard({ grades, onSave }: VaultScoutGradesCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [gradeValues, setGradeValues] = useState<Record<string, number[]>>({
    hitting: [50],
    power: [50],
    speed: [50],
    defense: [50],
    throwing: [50],
    leadership: [50],
    self_efficacy: [50],
  });
  const [notes, setNotes] = useState('');

  const latestGrade = grades[0];
  const canGradeToday = !latestGrade || 
    !latestGrade.next_prompt_date || 
    new Date(latestGrade.next_prompt_date) <= new Date();

  const daysUntilNextGrade = latestGrade?.next_prompt_date 
    ? Math.max(0, Math.ceil((new Date(latestGrade.next_prompt_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Calculate progression data - show up to 4 most recent cycles
  const progressionData = grades.slice(0, 4).reverse(); // Oldest to newest
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
      setGradeValues({
        hitting: [latestGrade.hitting_grade || 50],
        power: [latestGrade.power_grade || 50],
        speed: [latestGrade.speed_grade || 50],
        defense: [latestGrade.defense_grade || 50],
        throwing: [latestGrade.throwing_grade || 50],
        leadership: [latestGrade.leadership_grade || 50],
        self_efficacy: [latestGrade.self_efficacy_grade || 50],
      });
    }
  }, [latestGrade]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      hitting_grade: gradeValues.hitting[0],
      power_grade: gradeValues.power[0],
      speed_grade: gradeValues.speed[0],
      defense_grade: gradeValues.defense[0],
      throwing_grade: gradeValues.throwing[0],
      leadership_grade: gradeValues.leadership[0],
      self_efficacy_grade: gradeValues.self_efficacy[0],
      notes: notes || null,
    });
    setNotes('');
    setSaving(false);
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-lg">{t('vault.scoutGrades.title')}</CardTitle>
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
            <CardDescription>{t('vault.scoutGrades.description')}</CardDescription>
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
                          {GRADE_CATEGORIES.map((category) => {
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
                  <Star className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {t('vault.lockPeriod.readyToRecord')}
                  </span>
                </div>

                {GRADE_CATEGORIES.map((category) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{t(`vault.scoutGrades.categories.${category}`)}</Label>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          gradeValues[category][0] >= 70 ? 'text-green-500 border-green-500' :
                          gradeValues[category][0] >= 50 ? 'text-amber-500 border-amber-500' :
                          'text-red-500 border-red-500'
                        }`}
                      >
                        {gradeValues[category][0]} - {t(`vault.scoutGrades.levels.${gradeToLabel(gradeValues[category][0])}`)}
                      </Badge>
                    </div>
                    <Slider
                      value={gradeValues[category]}
                      onValueChange={(val) => setGradeValues({ ...gradeValues, [category]: val })}
                      min={20}
                      max={80}
                      step={5}
                      className="py-1"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>20</span>
                      <span>50</span>
                      <span>80</span>
                    </div>
                  </div>
                ))}

                <div className="space-y-1 pt-2">
                  <Label className="text-xs">{t('vault.scoutGrades.notes')}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('vault.scoutGrades.notesPlaceholder')}
                    className="min-h-[60px]"
                  />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? t('common.loading') : t('vault.scoutGrades.save')}
                </Button>
              </div>
            )}

            {/* History (Read-Only) */}
            {grades.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{t('vault.scoutGrades.history')}</Label>
                  <Badge variant="outline" className="text-xs">{t('vault.lockPeriod.readOnly')}</Badge>
                </div>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {grades.slice(0, 5).map((grade) => (
                      <div key={grade.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(grade.graded_at).toLocaleDateString()}
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-xs">
                          {grade.hitting_grade && <span>Hit: {grade.hitting_grade}</span>}
                          {grade.power_grade && <span>Pow: {grade.power_grade}</span>}
                          {grade.speed_grade && <span>Spd: {grade.speed_grade}</span>}
                          {grade.defense_grade && <span>Def: {grade.defense_grade}</span>}
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