import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cookie, Leaf, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CRAVING_NUTRIENT_MAP, CRAVING_OPTIONS, NUTRIENT_IMPACT } from '@/constants/nutrientPerformanceMap';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const RDA: Record<string, number> = {
  vitamin_a_mcg: 900, vitamin_c_mg: 90, vitamin_d_mcg: 15, vitamin_e_mg: 15,
  vitamin_k_mcg: 120, vitamin_b6_mg: 1.3, vitamin_b12_mcg: 2.4, folate_mcg: 400,
  calcium_mg: 1000, iron_mg: 8, magnesium_mg: 420, potassium_mg: 2600, zinc_mg: 11,
};

interface CravingGuidanceProps {
  date: Date;
  microCoverage: number;
  limitingFactorKeys?: string[];
}

interface CravingSuggestion {
  name: string;
  nutrient: string;
  impact: string;
}

export function CravingGuidance({ date, microCoverage, limitingFactorKeys = [] }: CravingGuidanceProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedCraving, setSelectedCraving] = useState<string | null>(null);
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['cravingGuidance', selectedCraving, dateStr, user?.id, limitingFactorKeys],
    queryFn: async (): Promise<CravingSuggestion[]> => {
      if (!user || !selectedCraving) return [];

      const { data: logs } = await supabase
        .from('vault_nutrition_logs')
        .select('micros')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr);

      const totals: Record<string, number> = {};
      for (const log of logs || []) {
        const micros = log.micros as Record<string, number> | null;
        if (!micros) continue;
        for (const [k, v] of Object.entries(micros)) {
          if (typeof v === 'number') totals[k] = (totals[k] || 0) + v;
        }
      }

      if (limitingFactorKeys.length === 0) return [];

      const cravingNutrients = CRAVING_NUTRIENT_MAP[selectedCraving] || [];
      const deficientKeys = cravingNutrients.filter(key => {
        const rda = RDA[key];
        if (!rda) return false;
        const isDeficient = ((totals[key] || 0) / rda) < 0.40;
        return isDeficient && limitingFactorKeys.includes(key);
      });

      if (deficientKeys.length === 0) return [];

      const topDeficient = deficientKeys[0];
      const { data: foods } = await supabase
        .from('nutrition_food_database')
        .select('name')
        .contains('food_category', [selectedCraving])
        .gt(topDeficient, 0)
        .order(topDeficient, { ascending: false })
        .limit(2);

      const label = topDeficient.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        .replace(/ Mcg$/, '').replace(/ Mg$/, '');

      return (foods || []).map((f: any) => ({
        name: f.name,
        nutrient: label,
        impact: NUTRIENT_IMPACT[topDeficient] || '',
      }));
    },
    enabled: !!user && !!selectedCraving && microCoverage > 0,
  });

  // Hard stop: don't render at all when no micro data
  if (microCoverage === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Cookie className="h-4 w-4 text-primary" />
            Craving Guidance
          </p>
          {selectedCraving && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={() => setSelectedCraving(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CRAVING_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={selectedCraving === opt.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedCraving(selectedCraving === opt.value ? null : opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {selectedCraving && (
          <div className="space-y-1">
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Analyzing...</p>
            ) : suggestions && suggestions.length > 0 ? (
              <>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Try Instead
                </p>
                {suggestions.map((s, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs px-2.5 py-1.5 rounded bg-emerald-500/5">
                    <Leaf className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">{s.name}</span>
                      <p className="text-[10px] text-muted-foreground">
                        {s.nutrient} → {s.impact}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No aligned foods found — prioritize nutrient correction first
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
