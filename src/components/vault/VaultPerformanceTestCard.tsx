import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Activity, ChevronDown, TrendingUp, TrendingDown, Minus, Calendar, Lock, AlertCircle, Hand, Target, Zap, Star, AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { useDataDensityLevel } from '@/hooks/useDataDensityLevel';
import {
  PERFORMANCE_METRICS,
  METRIC_CATEGORIES,
  CATEGORY_LABELS,
  getMetricsForContext,
  METRIC_BY_KEY,
  type MetricDefinition,
  type MetricCategory,
} from '@/data/performanceTestRegistry';
import { rawToGrade, gradeToLabel, gradeToColor, gradeAllResults } from '@/lib/gradeEngine';
import { computeToolGrades, TOOL_LABELS, type ToolName } from '@/data/positionToolProfiles';
import { generateReport, type TestIntelligenceReport } from '@/lib/testIntelligenceEngine';
import { getNextTestFocus, type NextTestFocus } from '@/lib/adaptiveTestPriority';
import { computeTrends, getTrendSummary, type MetricTrend } from '@/lib/longitudinalEngine';

interface PerformanceTest {
  id: string;
  test_type: string;
  sport: string;
  module: string;
  test_date: string;
  results: Record<string, number>;
  previous_results: Record<string, number> | null;
  next_entry_date?: string | null;
}

interface VaultPerformanceTestCardProps {
  tests: PerformanceTest[];
  onSave: (testType: string, results: Record<string, number>, handedness?: { throwing?: string; batting?: string }) => Promise<{ success: boolean }>;
  sport?: 'baseball' | 'softball';
  subscribedModules?: string[];
  autoOpen?: boolean;
  recapUnlockedAt?: Date | null;
  userProfile?: { throwing_hand?: string; batting_side?: string; primary_position?: string; date_of_birth?: string };
}

const LOCK_PERIOD_WEEKS = 6;
const DECIMAL_REGEX = /^\d*\.?\d*$/;

function StableDecimalInput({ value, onChange, placeholder = '0', className = '' }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '' || DECIMAL_REGEX.test(v)) onChange(v);
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

function calculateAge(dob: string | undefined | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function VaultPerformanceTestCard({
  tests,
  onSave,
  sport = 'baseball',
  subscribedModules = [],
  autoOpen = false,
  recapUnlockedAt = null,
  userProfile
}: VaultPerformanceTestCardProps) {
  const { t } = useTranslation();
  const { level: densityLevel } = useDataDensityLevel();
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [sixWeekGoals, setSixWeekGoals] = useState('');
  const [throwingHand, setThrowingHand] = useState<string>(userProfile?.throwing_hand || '');
  const [battingSide, setBattingSide] = useState<string>(userProfile?.batting_side || '');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showReport, setShowReport] = useState(false);

  const age = calculateAge(userProfile?.date_of_birth);
  const position = userProfile?.primary_position;

  // Filter modules to only show those the user has access to
  const availableModules = ['hitting', 'pitching', 'throwing'].filter(module => {
    if (subscribedModules.length === 0) return true;
    return subscribedModules.some(sub => sub.toLowerCase().includes(module));
  });

  useEffect(() => {
    if (availableModules.length > 0 && !availableModules.includes(selectedModule)) {
      setSelectedModule(availableModules[0]);
    }
  }, [availableModules, selectedModule]);

  useEffect(() => {
    if (autoOpen) {
      const timer = setTimeout(() => setIsOpen(true), 150);
      return () => clearTimeout(timer);
    }
  }, [autoOpen]);

  useEffect(() => {
    if (userProfile?.throwing_hand && !throwingHand) setThrowingHand(userProfile.throwing_hand);
    if (userProfile?.batting_side && !battingSide) setBattingSide(userProfile.batting_side);
  }, [userProfile, throwingHand, battingSide]);

  // Get metrics from registry, filtered by sport, module, and tier
  const registryMetrics = selectedModule
    ? getMetricsForContext(sport, selectedModule, densityLevel)
    : [];

  // Also include 'general' metrics
  const generalMetrics = selectedModule
    ? getMetricsForContext(sport, 'general', densityLevel)
    : [];

  // Combine and deduplicate
  const allMetrics = [...registryMetrics];
  for (const gm of generalMetrics) {
    if (!allMetrics.find(m => m.key === gm.key)) allMetrics.push(gm);
  }

  // Group by category
  const categorizedMetrics: Record<string, MetricDefinition[]> = {};
  for (const metric of allMetrics) {
    if (!categorizedMetrics[metric.category]) categorizedMetrics[metric.category] = [];
    categorizedMetrics[metric.category].push(metric);
  }

  // Adaptive focus data
  const testFocus: NextTestFocus | null = tests.length > 0
    ? getNextTestFocus(tests.map(t => ({ results: t.results, test_date: t.test_date })), sport, age)
    : null;
  const prioritizedKeys = new Set(testFocus?.prioritized.map(p => p.key) || []);
  const reducedKeys = new Set(testFocus?.reduced.map(r => r.key) || []);

  // Check if entry is locked
  const latestTest = tests[0];
  const latestTestDate = latestTest?.test_date ? new Date(latestTest.test_date) : null;
  const unlockedByRecap = recapUnlockedAt && (!latestTestDate || latestTestDate < recapUnlockedAt);
  const isLocked = justSaved || (!unlockedByRecap && latestTest?.next_entry_date && new Date(latestTest.next_entry_date) > new Date());
  const daysRemaining = latestTest?.next_entry_date
    ? Math.max(0, Math.ceil((new Date(latestTest.next_entry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Intelligence report for latest test
  const latestReport: TestIntelligenceReport | null = latestTest
    ? generateReport(latestTest.results, position, sport, age)
    : null;

  // Longitudinal trends
  const trends = tests.length >= 2
    ? computeTrends(tests.map(t => ({ results: t.results, test_date: t.test_date })), sport, age)
    : [];
  const trendSummary = trends.length > 0 ? getTrendSummary(trends) : null;

  const handleSave = async () => {
    const results: Record<string, number> = {};
    Object.entries(testResults).forEach(([key, value]) => {
      if (value && !isNaN(parseFloat(value))) results[key] = parseFloat(value);
    });

    if (Object.keys(results).length === 0) return;

    const handedness = (throwingHand || battingSide)
      ? { throwing: throwingHand || undefined, batting: battingSide || undefined }
      : undefined;

    setSaving(true);
    const result = await onSave(selectedModule, results, handedness);
    if (result.success) setJustSaved(true);
    setTestResults({});
    setSaving(false);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const getTrendIcon = (metricKey: string) => {
    const trend = trends.find(t => t.metricKey === metricKey);
    if (!trend) return null;
    if (trend.trend === 'improving') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend.trend === 'regressing') return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  if (availableModules.length === 0) return null;

  const renderBilateralInputs = (metric: MetricDefinition) => {
    const leftKey = `${metric.key}_left`;
    const rightKey = `${metric.key}_right`;
    const sideLabels = metric.bilateralType === 'leg'
      ? [t('vault.performance.leftLeg', 'Left Leg'), t('vault.performance.rightLeg', 'Right Leg')]
      : metric.bilateralType === 'hand'
      ? [t('vault.performance.leftHand', 'Left Hand'), t('vault.performance.rightHand', 'Right Hand')]
      : [t('vault.performance.leftSide', 'Left Side'), t('vault.performance.rightSide', 'Right Side')];

    return (
      <div key={metric.key} className="p-2 rounded-lg bg-background/50 border border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Label className="text-xs font-medium">{metric.label} ({metric.unit})</Label>
          {prioritizedKeys.has(metric.key) && <Badge className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-600 border-amber-500/30">Focus</Badge>}
          {reducedKeys.has(metric.key) && <Badge variant="outline" className="text-[10px] px-1 py-0">Stable</Badge>}
        </div>
        {metric.instructions && (
          <p className="text-[10px] text-muted-foreground mb-2">{metric.instructions}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">{sideLabels[0]}</Label>
            <StableDecimalInput
              value={testResults[leftKey] || ''}
              onChange={(v) => setTestResults({ ...testResults, [leftKey]: v })}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">{sideLabels[1]}</Label>
            <StableDecimalInput
              value={testResults[rightKey] || ''}
              onChange={(v) => setTestResults({ ...testResults, [rightKey]: v })}
              className="h-8"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderRegularInput = (metric: MetricDefinition) => (
    <div key={metric.key} className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-xs">{metric.label} ({metric.unit})</Label>
        {prioritizedKeys.has(metric.key) && <Badge className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-600 border-amber-500/30">Focus</Badge>}
        {reducedKeys.has(metric.key) && <Badge variant="outline" className="text-[10px] px-1 py-0">Stable</Badge>}
      </div>
      {metric.instructions && (
        <p className="text-[10px] text-muted-foreground leading-tight">{metric.instructions}</p>
      )}
      <StableDecimalInput
        value={testResults[metric.key] || ''}
        onChange={(v) => setTestResults({ ...testResults, [metric.key]: v })}
        className="h-8"
      />
    </div>
  );

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-500" />
                <CardTitle className="text-lg">{t('vault.performance.title')}</CardTitle>
                {tests.length > 0 && <Badge variant="secondary" className="text-xs">{tests.length}</Badge>}
                {isLocked && (
                  <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-600">
                    <Lock className="h-3 w-3" />
                    {t('vault.lockPeriod.locked')}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription>{t('vault.performance.description')}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Lock Period Info */}
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">{t('vault.lockPeriod.sixWeeks')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('vault.lockPeriod.entriesImmutable')}</p>
              </AlertDescription>
            </Alert>

            {/* Intelligence Report — shows for latest test */}
            {latestReport && latestReport.metricGrades.length > 0 && (
              <Collapsible open={showReport} onOpenChange={setShowReport}>
                <CollapsibleTrigger asChild>
                  <div className="cursor-pointer p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-500/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-cyan-500" />
                        <span className="text-sm font-medium">Performance Intelligence</span>
                        {latestReport.toolGrades.overall !== null && (
                          <Badge className="bg-cyan-500/20 text-cyan-600 border-cyan-500/30 text-xs">
                            Overall: {latestReport.toolGrades.overall}
                          </Badge>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showReport ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 pt-3">
                    {/* 5-Tool Grades */}
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <Label className="text-xs font-medium mb-2 block">5-Tool Profile</Label>
                      <div className="grid grid-cols-5 gap-1">
                        {(['hit', 'power', 'run', 'field', 'arm'] as ToolName[]).map(tool => {
                          const grade = latestReport.toolGrades[tool];
                          return (
                            <div key={tool} className="text-center">
                              <p className="text-[10px] text-muted-foreground">{TOOL_LABELS[tool]}</p>
                              <p className={`text-lg font-bold ${grade !== null ? gradeToColor(grade) : 'text-muted-foreground'}`}>
                                {grade !== null ? grade : '—'}
                              </p>
                              {grade !== null && (
                                <p className="text-[9px] text-muted-foreground">{gradeToLabel(grade)}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Strengths */}
                    {latestReport.topStrengths.length > 0 && (
                      <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <Label className="text-xs font-medium mb-2 flex items-center gap-1">
                          <Star className="h-3 w-3 text-green-500" /> Top Strengths
                        </Label>
                        {latestReport.topStrengths.map(s => (
                          <div key={s.key} className="flex justify-between items-center text-xs py-0.5">
                            <span>{s.label}</span>
                            <span className={`font-medium ${gradeToColor(s.grade)}`}>{s.grade} ({s.gradeLabel})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Limiting Factors */}
                    {latestReport.limitingFactors.length > 0 && (
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <Label className="text-xs font-medium mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" /> Limiting Factors
                        </Label>
                        {latestReport.limitingFactors.map(lf => (
                          <div key={lf.metric.key} className="py-1 border-b border-border/30 last:border-0">
                            <div className="flex justify-between items-center text-xs">
                              <span>{lf.metric.label}</span>
                              <span className={`font-medium ${gradeToColor(lf.metric.grade)}`}>{lf.metric.grade}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{lf.blocks}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Training Priority */}
                    <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <Label className="text-xs font-medium mb-1 flex items-center gap-1">
                        <ArrowRight className="h-3 w-3 text-blue-500" /> Training Priority
                      </Label>
                      <p className="text-xs text-muted-foreground">{latestReport.trainingPriority}</p>
                    </div>

                    {/* Trends */}
                    {trendSummary && (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <Label className="text-xs font-medium mb-2 block">Trend Analysis</Label>
                        <div className="flex gap-3 text-xs mb-2">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-500" /> {trendSummary.improving} improving
                          </span>
                          <span className="flex items-center gap-1">
                            <Minus className="h-3 w-3 text-muted-foreground" /> {trendSummary.plateaued} stable
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingDown className="h-3 w-3 text-red-500" /> {trendSummary.regressing} declining
                          </span>
                        </div>
                        {trends.filter(t => t.projection).slice(0, 3).map(t => (
                          <p key={t.metricKey} className="text-[10px] text-muted-foreground py-0.5">
                            {t.label}: {t.projection}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {isLocked ? (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">{t('vault.lockPeriod.sectionLocked')}</span>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {daysRemaining > 0
                      ? `Next test available: ${latestTest?.next_entry_date ? new Date(latestTest.next_entry_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''} (${daysRemaining} days remaining)`
                      : 'Test available now'}
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <Label className="font-medium text-green-700 dark:text-green-400">
                    {t('vault.lockPeriod.readyToRecord')}
                  </Label>
                </div>

                {/* Handedness Section */}
                <div className="grid grid-cols-2 gap-3 p-2 rounded-lg bg-muted/20 border border-border/50">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Hand className="h-3 w-3" />
                      {t('vault.performance.throwingHand')}
                    </Label>
                    <Select value={throwingHand} onValueChange={setThrowingHand}>
                      <SelectTrigger className="h-8"><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="R">{t('vault.performance.handedness.right')}</SelectItem>
                        <SelectItem value="L">{t('vault.performance.handedness.left')}</SelectItem>
                        <SelectItem value="B">{t('vault.performance.handedness.both')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {t('vault.performance.battingSide')}
                    </Label>
                    <Select value={battingSide} onValueChange={setBattingSide}>
                      <SelectTrigger className="h-8"><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="R">{t('vault.performance.handedness.right')}</SelectItem>
                        <SelectItem value="L">{t('vault.performance.handedness.left')}</SelectItem>
                        <SelectItem value="B">{t('vault.performance.handedness.switch')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('vault.performance.selectModule')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModules.includes('hitting') && <SelectItem value="hitting">{t('onboarding.hitting')}</SelectItem>}
                    {availableModules.includes('pitching') && <SelectItem value="pitching">{t('onboarding.pitching')}</SelectItem>}
                    {availableModules.includes('throwing') && <SelectItem value="throwing">{t('onboarding.throwing')}</SelectItem>}
                  </SelectContent>
                </Select>

                {/* Adaptive Focus Banner */}
                {testFocus && testFocus.prioritized.length > 0 && (
                  <Alert className="bg-cyan-500/10 border-cyan-500/30">
                    <Info className="h-4 w-4 text-cyan-500" />
                    <AlertDescription className="text-xs">
                      <span className="font-medium text-cyan-700 dark:text-cyan-400">Next Cycle Focus:</span>{' '}
                      {testFocus.summary}
                    </AlertDescription>
                  </Alert>
                )}

                {selectedModule && Object.keys(categorizedMetrics).length > 0 && (
                  <div className="space-y-2">
                    {METRIC_CATEGORIES.filter(cat => categorizedMetrics[cat]?.length > 0).map(category => {
                      const metrics = categorizedMetrics[category];
                      const hasPrioritized = metrics.some(m => prioritizedKeys.has(m.key));
                      const isExpanded = expandedCategories.has(category) || hasPrioritized;
                      const bilateralMetrics = metrics.filter(m => m.bilateral);
                      const regularMetrics = metrics.filter(m => !m.bilateral);

                      return (
                        <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/50 cursor-pointer hover:bg-muted/40 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{CATEGORY_LABELS[category]}</span>
                                <Badge variant="outline" className="text-[10px]">{metrics.length}</Badge>
                                {hasPrioritized && <Badge className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-600 border-amber-500/30">Focus</Badge>}
                              </div>
                              <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-2 pt-2">
                              {bilateralMetrics.map(m => renderBilateralInputs(m))}
                              {regularMetrics.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                  {regularMetrics.map(m => renderRegularInput(m))}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                )}

                {/* 6-Week Goals */}
                <div className="space-y-2 pt-3 border-t border-border/50">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-500" />
                    {t('vault.performance.sixWeekGoals')}
                  </Label>
                  <Textarea
                    value={sixWeekGoals}
                    onChange={(e) => setSixWeekGoals(e.target.value)}
                    placeholder={t('vault.performance.sixWeekGoalsPlaceholder')}
                    rows={3}
                    maxLength={500}
                    className="resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground text-right">{sixWeekGoals.length}/500</p>
                </div>

                <Button onClick={handleSave} disabled={saving || !selectedModule} size="sm" className="w-full">
                  {saving ? t('common.loading') : t('vault.performance.save')}
                </Button>
              </div>
            )}

            {/* Recent Tests (Read-Only History) */}
            {tests.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{t('vault.performance.recentTests')}</Label>
                  <Badge variant="outline" className="text-xs">{t('vault.lockPeriod.readOnly')}</Badge>
                </div>
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">
                    {tests.map((test) => {
                      const grades = gradeAllResults(test.results, sport, age);
                      return (
                        <div key={test.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{test.test_type}</Badge>
                              {(test.results as any)?._throwing_hand && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('vault.performance.throwingHand')}: {(test.results as any)._throwing_hand}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(test.test_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(test.results)
                              .filter(([key]) => !key.startsWith('_'))
                              .map(([key, value]) => {
                                const def = METRIC_BY_KEY[key];
                                const grade = grades[key];
                                return (
                                  <div key={key} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground text-xs">
                                      {def?.label || t(`vault.performance.metrics.${key}`)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="font-medium">{value}</span>
                                      {grade && (
                                        <span className={`text-[10px] font-bold ${gradeToColor(grade)}`}>{grade}</span>
                                      )}
                                      {getTrendIcon(key)}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
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
