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
import { Activity, ChevronDown, TrendingUp, TrendingDown, Minus, Calendar, Lock, AlertCircle, Hand } from 'lucide-react';

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
  userProfile?: { throwing_hand?: string; batting_side?: string };
}

const LOCK_PERIOD_WEEKS = 6;

// Sport-specific test types by module - all bilateral jump metrics
const TEST_TYPES_BY_SPORT = {
  baseball: {
    hitting: [
      'ten_yard_dash',
      'tee_exit_velocity',
      'max_tee_distance',
      'sl_broad_jump_left',
      'sl_broad_jump_right',
      'sl_lateral_broad_jump_left',
      'sl_lateral_broad_jump_right',
      'mb_situp_throw',
      'seated_chest_pass'
    ],
    pitching: [
      'long_toss_distance',
      'velocity',
      'ten_yard_dash',
      'sl_broad_jump_left',
      'sl_broad_jump_right',
      'sl_vert_jump_left',
      'sl_vert_jump_right',
      'mb_situp_throw',
      'seated_chest_pass'
    ],
    throwing: [
      'long_toss_distance',
      'ten_yard_dash',
      'sl_broad_jump_left',
      'sl_broad_jump_right',
      'sl_lateral_broad_jump_left',
      'sl_lateral_broad_jump_right',
      'sl_vert_jump_left',
      'sl_vert_jump_right',
      'mb_situp_throw',
      'seated_chest_pass'
    ]
  },
  softball: {
    hitting: [
      'ten_yard_dash',
      'tee_exit_velocity',
      'max_tee_distance',
      'sl_broad_jump_left',
      'sl_broad_jump_right',
      'sl_lateral_broad_jump_left',
      'sl_lateral_broad_jump_right',
      'sl_vert_jump_left',
      'sl_vert_jump_right',
      'mb_situp_throw',
      'seated_chest_pass'
    ],
    pitching: [
      'long_toss_distance',
      'velocity',
      'ten_yard_dash',
      'sl_broad_jump_left',
      'sl_broad_jump_right',
      'sl_vert_jump_left',
      'sl_vert_jump_right',
      'mb_situp_throw',
      'seated_chest_pass'
    ],
    throwing: [
      'long_toss_distance',
      'ten_yard_dash',
      'sl_broad_jump_left',
      'sl_broad_jump_right',
      'sl_lateral_broad_jump_left',
      'sl_lateral_broad_jump_right',
      'sl_vert_jump_left',
      'sl_vert_jump_right',
      'mb_situp_throw',
      'seated_chest_pass'
    ]
  }
};

// Metric configuration with units and trend direction - all bilateral jump metrics
const TEST_METRICS: Record<string, { unit: string; higher_better: boolean }> = {
  // Distance metrics (feet)
  long_toss_distance: { unit: 'ft', higher_better: true },
  long_toss_distance_left: { unit: 'ft', higher_better: true },
  long_toss_distance_right: { unit: 'ft', higher_better: true },
  max_tee_distance: { unit: 'ft', higher_better: true },
  max_tee_distance_left: { unit: 'ft', higher_better: true },
  max_tee_distance_right: { unit: 'ft', higher_better: true },
  mb_situp_throw: { unit: 'ft', higher_better: true },
  seated_chest_pass: { unit: 'ft', higher_better: true },
  
  // Distance metrics (inches) - all bilateral jumps
  sl_broad_jump_left: { unit: 'in', higher_better: true },
  sl_broad_jump_right: { unit: 'in', higher_better: true },
  sl_lateral_broad_jump_left: { unit: 'in', higher_better: true },
  sl_lateral_broad_jump_right: { unit: 'in', higher_better: true },
  sl_vert_jump_left: { unit: 'in', higher_better: true },
  sl_vert_jump_right: { unit: 'in', higher_better: true },
  
  // Speed metrics (lower is better)
  ten_yard_dash: { unit: 's', higher_better: false },
  
  // Velocity metrics (mph)
  velocity: { unit: 'mph', higher_better: true },
  velocity_left: { unit: 'mph', higher_better: true },
  velocity_right: { unit: 'mph', higher_better: true },
  tee_exit_velocity: { unit: 'mph', higher_better: true },
  tee_exit_velocity_left: { unit: 'mph', higher_better: true },
  tee_exit_velocity_right: { unit: 'mph', higher_better: true },
};

// Define all bilateral metric groups for grouped UI rendering (leg-based)
const BILATERAL_METRIC_GROUPS: Record<string, [string, string]> = {
  sl_broad_jump: ['sl_broad_jump_left', 'sl_broad_jump_right'],
  sl_lateral_broad_jump: ['sl_lateral_broad_jump_left', 'sl_lateral_broad_jump_right'],
  sl_vert_jump: ['sl_vert_jump_left', 'sl_vert_jump_right'],
};

// Switch hitter bilateral groups (batting side = "B")
const SWITCH_HITTER_BILATERAL_GROUPS: Record<string, [string, string]> = {
  tee_exit_velocity: ['tee_exit_velocity_left', 'tee_exit_velocity_right'],
  max_tee_distance: ['max_tee_distance_left', 'max_tee_distance_right'],
};

// Both-handed thrower bilateral groups (throwing hand = "B")
const BOTH_HANDS_THROWING_GROUPS: Record<string, [string, string]> = {
  long_toss_distance: ['long_toss_distance_left', 'long_toss_distance_right'],
  velocity: ['velocity_left', 'velocity_right'],
};

// Medicine ball metrics that require 5lb ball hint
const MEDICINE_BALL_METRICS = ['mb_situp_throw', 'seated_chest_pass'];

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
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  
  // Handedness state - initialize from user profile if available
  const [throwingHand, setThrowingHand] = useState<string>(userProfile?.throwing_hand || '');
  const [battingSide, setBattingSide] = useState<string>(userProfile?.batting_side || '');

  // Filter modules to only show those the user has access to
  const availableModules = ['hitting', 'pitching', 'throwing'].filter(module => {
    if (subscribedModules.length === 0) return true; // Show all if no modules passed
    return subscribedModules.some(sub => sub.toLowerCase().includes(module));
  });

  // Set default module when available modules change
  useEffect(() => {
    if (availableModules.length > 0 && !availableModules.includes(selectedModule)) {
      setSelectedModule(availableModules[0]);
    }
  }, [availableModules, selectedModule]);

  // Handle autoOpen changes with delay for smooth animation
  useEffect(() => {
    if (autoOpen) {
      const timer = setTimeout(() => setIsOpen(true), 150);
      return () => clearTimeout(timer);
    }
  }, [autoOpen]);
  
  // Update handedness from profile when it changes
  useEffect(() => {
    if (userProfile?.throwing_hand && !throwingHand) {
      setThrowingHand(userProfile.throwing_hand);
    }
    if (userProfile?.batting_side && !battingSide) {
      setBattingSide(userProfile.batting_side);
    }
  }, [userProfile, throwingHand, battingSide]);

  // Get metrics for selected module and sport
  const testTypes = TEST_TYPES_BY_SPORT[sport] || TEST_TYPES_BY_SPORT.baseball;
  const metrics = selectedModule ? (testTypes[selectedModule as keyof typeof testTypes] || []) : [];
  
  // Get all bilateral metric keys for filtering (leg-based)
  const allBilateralMetrics = Object.values(BILATERAL_METRIC_GROUPS).flat();
  
  // Identify which leg-based bilateral groups are present in current metrics
  const presentBilateralGroups = Object.entries(BILATERAL_METRIC_GROUPS)
    .filter(([_, [left, right]]) => metrics.includes(left) || metrics.includes(right))
    .map(([groupName]) => groupName);
  
  // Determine which handedness-based bilateral metrics apply
  const isSwitchHitter = battingSide === 'B' && selectedModule === 'hitting';
  const isBothHandsThrower = throwingHand === 'B' && (selectedModule === 'pitching' || selectedModule === 'throwing');
  
  // Get active switch hitter metrics (only if hitting and switch)
  const activeSwitchHitterMetrics = isSwitchHitter 
    ? Object.keys(SWITCH_HITTER_BILATERAL_GROUPS).filter(m => metrics.includes(m))
    : [];
    
  // Get active both-hands thrower metrics
  const activeBothHandsMetrics = isBothHandsThrower
    ? Object.keys(BOTH_HANDS_THROWING_GROUPS).filter(m => {
        // For throwing module, only long_toss_distance applies (no velocity)
        if (selectedModule === 'throwing' && m === 'velocity') return false;
        return metrics.includes(m);
      })
    : [];
  
  // Filter out bilateral metrics for regular rendering
  const bilateralMetrics = metrics.filter(m => allBilateralMetrics.includes(m));
  const handednessMetrics = [...activeSwitchHitterMetrics, ...activeBothHandsMetrics];
  const regularMetrics = metrics.filter(m => 
    !allBilateralMetrics.includes(m) && !handednessMetrics.includes(m)
  );

  // Check if entry is locked
  // Recap-unlock override: If recap was generated and no entry exists after that date, unlock the card
  const latestTest = tests[0];
  const latestTestDate = latestTest?.test_date ? new Date(latestTest.test_date) : null;
  const unlockedByRecap = recapUnlockedAt && (!latestTestDate || latestTestDate < recapUnlockedAt);
  
  const isLocked = justSaved || (!unlockedByRecap && latestTest?.next_entry_date && new Date(latestTest.next_entry_date) > new Date());
  const daysRemaining = latestTest?.next_entry_date 
    ? Math.max(0, Math.ceil((new Date(latestTest.next_entry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleSave = async () => {
    const results: Record<string, number> = {};
    Object.entries(testResults).forEach(([key, value]) => {
      if (value) results[key] = parseFloat(value);
    });
    
    if (Object.keys(results).length === 0) return;
    
    // Include handedness data if provided
    const handedness = (throwingHand || battingSide) 
      ? { throwing: throwingHand || undefined, batting: battingSide || undefined }
      : undefined;
    
    setSaving(true);
    const result = await onSave(selectedModule, results, handedness);
    if (result.success) {
      setJustSaved(true); // Immediately show as locked
    }
    setTestResults({});
    setSaving(false);
  };

  const getTrendIcon = (current: number, previous: number, metric: string) => {
    const info = TEST_METRICS[metric];
    const improved = info?.higher_better ? current > previous : current < previous;
    const declined = info?.higher_better ? current < previous : current > previous;
    
    if (improved) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (declined) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const recentTests = tests.slice(0, 5);

  // Show nothing if user has no module access
  if (availableModules.length === 0) {
    return null;
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-500" />
                <CardTitle className="text-lg">{t('vault.performance.title')}</CardTitle>
                {tests.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{tests.length}</Badge>
                )}
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
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {t('vault.lockPeriod.sixWeeks')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('vault.lockPeriod.entriesImmutable')}
                </p>
              </AlertDescription>
            </Alert>

            {isLocked ? (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">{t('vault.lockPeriod.sectionLocked')}</span>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {t('vault.lockPeriod.lockedUntil', { days: daysRemaining })}
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              /* New Test Entry */
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
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
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
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
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
                    {availableModules.includes('hitting') && (
                      <SelectItem value="hitting">{t('onboarding.hitting')}</SelectItem>
                    )}
                    {availableModules.includes('pitching') && (
                      <SelectItem value="pitching">{t('onboarding.pitching')}</SelectItem>
                    )}
                    {availableModules.includes('throwing') && (
                      <SelectItem value="throwing">{t('onboarding.throwing')}</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {selectedModule && metrics.length > 0 && (
                  <div className="space-y-3">
                    {/* Leg-based bilateral jump metrics - Special grouped rendering */}
                    {presentBilateralGroups.map((groupName) => {
                      const [leftKey, rightKey] = BILATERAL_METRIC_GROUPS[groupName];
                      return (
                        <div key={groupName} className="p-2 rounded-lg bg-background/50 border border-border/50">
                          <Label className="text-xs font-medium mb-2 block">
                            {t(`vault.performance.metrics.${groupName}`)} (in)
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                {t('vault.performance.leftLeg')}
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={testResults[leftKey] || ''}
                                onChange={(e) => setTestResults({ ...testResults, [leftKey]: e.target.value })}
                                placeholder="0"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                {t('vault.performance.rightLeg')}
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={testResults[rightKey] || ''}
                                onChange={(e) => setTestResults({ ...testResults, [rightKey]: e.target.value })}
                                placeholder="0"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Switch Hitter bilateral metrics (Left Side / Right Side) */}
                    {activeSwitchHitterMetrics.map((metricName) => {
                      const [leftKey, rightKey] = SWITCH_HITTER_BILATERAL_GROUPS[metricName];
                      const metricInfo = TEST_METRICS[metricName];
                      return (
                        <div key={metricName} className="p-2 rounded-lg bg-background/50 border border-border/50">
                          <Label className="text-xs font-medium mb-2 block">
                            {t(`vault.performance.metrics.${metricName}`)} ({metricInfo?.unit})
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                {t('vault.performance.leftSide')}
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={testResults[leftKey] || ''}
                                onChange={(e) => setTestResults({ ...testResults, [leftKey]: e.target.value })}
                                placeholder="0"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                {t('vault.performance.rightSide')}
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={testResults[rightKey] || ''}
                                onChange={(e) => setTestResults({ ...testResults, [rightKey]: e.target.value })}
                                placeholder="0"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Both-Handed Thrower bilateral metrics (Left Hand / Right Hand) */}
                    {activeBothHandsMetrics.map((metricName) => {
                      const [leftKey, rightKey] = BOTH_HANDS_THROWING_GROUPS[metricName];
                      const metricInfo = TEST_METRICS[metricName];
                      return (
                        <div key={metricName} className="p-2 rounded-lg bg-background/50 border border-border/50">
                          <Label className="text-xs font-medium mb-2 block">
                            {t(`vault.performance.metrics.${metricName}`)} ({metricInfo?.unit})
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                {t('vault.performance.leftHand')}
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={testResults[leftKey] || ''}
                                onChange={(e) => setTestResults({ ...testResults, [leftKey]: e.target.value })}
                                placeholder="0"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                {t('vault.performance.rightHand')}
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={testResults[rightKey] || ''}
                                onChange={(e) => setTestResults({ ...testResults, [rightKey]: e.target.value })}
                                placeholder="0"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Medicine Ball hint - show when MB metrics are present */}
                    {regularMetrics.some(m => MEDICINE_BALL_METRICS.includes(m)) && (
                      <Alert className="bg-blue-500/10 border-blue-500/30">
                        <AlertCircle className="h-4 w-4 text-blue-500" />
                        <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
                          {t('vault.performance.medicineBallHint')}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Regular metrics */}
                    <div className="grid grid-cols-2 gap-2">
                      {regularMetrics.map((metric) => (
                        <div key={metric} className="space-y-1">
                          <Label className="text-xs">
                            {t(`vault.performance.metrics.${metric}`)} ({TEST_METRICS[metric]?.unit})
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={testResults[metric] || ''}
                            onChange={(e) => setTestResults({ ...testResults, [metric]: e.target.value })}
                            placeholder="0"
                            className="h-8"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={handleSave} disabled={saving || !selectedModule} size="sm" className="w-full">
                  {saving ? t('common.loading') : t('vault.performance.save')}
                </Button>
              </div>
            )}

            {/* Recent Tests (Read-Only History) */}
            {recentTests.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{t('vault.performance.recentTests')}</Label>
                  <Badge variant="outline" className="text-xs">{t('vault.lockPeriod.readOnly')}</Badge>
                </div>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {recentTests.map((test) => (
                      <div key={test.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{test.test_type}</Badge>
                            {/* Show handedness if stored */}
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
                            .filter(([key]) => !key.startsWith('_')) // Exclude metadata
                            .map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground text-xs">
                                {t(`vault.performance.metrics.${key}`)}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{value}</span>
                                {test.previous_results?.[key] && getTrendIcon(value, test.previous_results[key], key)}
                              </div>
                            </div>
                          ))}
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
