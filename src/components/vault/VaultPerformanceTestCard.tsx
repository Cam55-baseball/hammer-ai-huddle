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
import { Activity, ChevronDown, TrendingUp, TrendingDown, Minus, Calendar, Lock, AlertCircle } from 'lucide-react';

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
  onSave: (testType: string, results: Record<string, number>) => Promise<{ success: boolean }>;
  sport?: 'baseball' | 'softball';
  subscribedModules?: string[];
  autoOpen?: boolean;
}

const LOCK_PERIOD_WEEKS = 6;

// Sport-specific test types by module
const TEST_TYPES_BY_SPORT = {
  baseball: {
    hitting: [
      'ten_yard_dash',
      'exit_velocity',
      'max_tee_distance',
      'sl_broad_jump',
      'sl_lateral_broad_jump',
      'mb_situp_throw',
      'seated_chest_pass'
    ],
    pitching: [
      'long_toss_distance',
      'velocity',
      'ten_yard_dash',
      'sl_broad_jump',
      'sl_vert_jump',
      'mb_situp_throw',
      'seated_chest_pass'
    ],
    throwing: [
      'long_toss_distance',
      'ten_yard_dash',
      'sl_broad_jump',
      'sl_lateral_broad_jump',
      'sl_vert_jump',
      'mb_situp_throw',
      'seated_chest_pass'
    ]
  },
  softball: {
    hitting: [
      'ten_yard_dash',
      'exit_velocity',
      'max_tee_distance',
      'sl_broad_jump',
      'sl_lateral_broad_jump',
      'sl_vert_jump',
      'mb_situp_throw',
      'seated_chest_pass'
    ],
    pitching: [
      'long_toss_distance',
      'velocity',
      'ten_yard_dash',
      'sl_broad_jump',
      'sl_vert_jump',
      'mb_situp_throw',
      'seated_chest_pass'
    ],
    throwing: [
      'long_toss_distance',
      'ten_yard_dash',
      'sl_broad_jump',
      'sl_lateral_broad_jump',
      'sl_vert_jump',
      'mb_situp_throw',
      'seated_chest_pass'
    ]
  }
};

// Metric configuration with units and trend direction
const TEST_METRICS: Record<string, { unit: string; higher_better: boolean }> = {
  // Distance metrics (feet)
  long_toss_distance: { unit: 'ft', higher_better: true },
  max_tee_distance: { unit: 'ft', higher_better: true },
  mb_situp_throw: { unit: 'ft', higher_better: true },
  seated_chest_pass: { unit: 'ft', higher_better: true },
  
  // Distance metrics (inches)
  sl_broad_jump: { unit: 'in', higher_better: true },
  sl_lateral_broad_jump: { unit: 'in', higher_better: true },
  sl_vert_jump: { unit: 'in', higher_better: true },
  
  // Speed metrics (lower is better)
  ten_yard_dash: { unit: 's', higher_better: false },
  
  // Velocity metrics (mph)
  velocity: { unit: 'mph', higher_better: true },
  exit_velocity: { unit: 'mph', higher_better: true },
};

export function VaultPerformanceTestCard({ 
  tests, 
  onSave, 
  sport = 'baseball',
  subscribedModules = [],
  autoOpen = false 
}: VaultPerformanceTestCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [saving, setSaving] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [testResults, setTestResults] = useState<Record<string, string>>({});

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

  // Handle autoOpen changes
  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
    }
  }, [autoOpen]);

  // Get metrics for selected module and sport
  const testTypes = TEST_TYPES_BY_SPORT[sport] || TEST_TYPES_BY_SPORT.baseball;
  const metrics = selectedModule ? (testTypes[selectedModule as keyof typeof testTypes] || []) : [];

  // Check if entry is locked
  const latestTest = tests[0];
  const isLocked = latestTest?.next_entry_date && new Date(latestTest.next_entry_date) > new Date();
  const daysRemaining = latestTest?.next_entry_date 
    ? Math.max(0, Math.ceil((new Date(latestTest.next_entry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleSave = async () => {
    const results: Record<string, number> = {};
    Object.entries(testResults).forEach(([key, value]) => {
      if (value) results[key] = parseFloat(value);
    });
    
    if (Object.keys(results).length === 0) return;
    
    setSaving(true);
    await onSave(selectedModule, results);
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
                  <div className="grid grid-cols-2 gap-2">
                    {metrics.map((metric) => (
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
                          <Badge variant="outline">{test.test_type}</Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(test.test_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(test.results).map(([key, value]) => (
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
