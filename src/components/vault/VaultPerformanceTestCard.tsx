import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, ChevronDown, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface PerformanceTest {
  id: string;
  test_type: string;
  sport: string;
  module: string;
  test_date: string;
  results: Record<string, number>;
  previous_results: Record<string, number> | null;
}

interface VaultPerformanceTestCardProps {
  tests: PerformanceTest[];
  sport: string;
  onSave: (testType: string, results: Record<string, number>) => Promise<{ success: boolean }>;
}

const TEST_TYPES = {
  hitting: ['bat_speed', 'exit_velocity', 'launch_angle', 'sprint_60', 'vertical_jump'],
  pitching: ['velocity', 'spin_rate', 'command_score', 'arm_health', 'sprint_60'],
  throwing: ['velocity', 'accuracy_score', 'pop_time', 'arm_speed', 'sprint_60'],
};

const TEST_METRICS: Record<string, { unit: string; higher_better: boolean }> = {
  bat_speed: { unit: 'mph', higher_better: true },
  exit_velocity: { unit: 'mph', higher_better: true },
  launch_angle: { unit: '°', higher_better: false },
  velocity: { unit: 'mph', higher_better: true },
  spin_rate: { unit: 'rpm', higher_better: true },
  command_score: { unit: '/10', higher_better: true },
  arm_health: { unit: '/10', higher_better: true },
  accuracy_score: { unit: '/10', higher_better: true },
  pop_time: { unit: 's', higher_better: false },
  arm_speed: { unit: 'mph', higher_better: true },
  sprint_60: { unit: 's', higher_better: false },
  vertical_jump: { unit: 'in', higher_better: true },
};

export function VaultPerformanceTestCard({ tests, sport, onSave }: VaultPerformanceTestCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('hitting');
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const metrics = TEST_TYPES[selectedModule as keyof typeof TEST_TYPES] || TEST_TYPES.hitting;

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
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription>{t('vault.performance.description')}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* New Test Entry */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-3">
              <Label className="font-medium">{t('vault.performance.newTest')}</Label>
              
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hitting">{t('onboarding.hitting')}</SelectItem>
                  <SelectItem value="pitching">{t('onboarding.pitching')}</SelectItem>
                  <SelectItem value="throwing">{t('onboarding.throwing')}</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-2">
                {metrics.map((metric) => (
                  <div key={metric} className="space-y-1">
                    <Label className="text-xs">
                      {t(`vault.performance.metrics.${metric}`)} ({TEST_METRICS[metric]?.unit})
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={testResults[metric] || ''}
                      onChange={(e) => setTestResults({ ...testResults, [metric]: e.target.value })}
                      placeholder="0"
                      className="h-8"
                    />
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
                {saving ? t('common.loading') : t('vault.performance.save')}
              </Button>
            </div>

            {/* Recent Tests */}
            {recentTests.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('vault.performance.recentTests')}</Label>
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
