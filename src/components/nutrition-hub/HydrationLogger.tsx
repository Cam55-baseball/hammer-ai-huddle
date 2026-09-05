import { useState } from 'react';
import { Droplets, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { LIQUID_TYPES, classifyLiquid } from '@/constants/hydrationClassification';
import { useHydration, type AiHydrationAnalysis } from '@/hooks/useHydration';

const QUICK_AMOUNTS = [8, 16, 24, 32];

interface Props {
  /** Compact spacing when embedded in a dialog. */
  dense?: boolean;
  onLogged?: (oz: number) => void;
}

/**
 * The full hydration flow — amount, drink type, quality class and the AI
 * "something else" path — in one embeddable block, so meal logging surfaces
 * get the same logging the Quick Actions card has, not a reduced version.
 */
export function HydrationLogger({ dense = false, onLogged }: Props) {
  const { addWater, todayTotal, dailyGoal } = useHydration();

  const [amount, setAmount] = useState<number>(8);
  const [customAmount, setCustomAmount] = useState('');
  const [liquidType, setLiquidType] = useState<string>('water');
  const [quality, setQuality] = useState<'quality' | 'filler'>('quality');
  const [otherText, setOtherText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiHydrationAnalysis | null>(null);
  const [logging, setLogging] = useState(false);

  const chooseType = (value: string) => {
    setLiquidType(value);
    setQuality(classifyLiquid(value));
    if (value !== 'other') {
      setAiAnalysis(null);
      setOtherText('');
    }
  };

  const chooseAmount = (oz: number) => {
    setAmount(oz);
    setCustomAmount('');
  };

  const handleCustomAmount = (raw: string) => {
    setCustomAmount(raw);
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) setAmount(Math.round(parsed));
  };

  const analyzeOther = async () => {
    const text = otherText.trim();
    if (text.length < 2) {
      toast.error('Tell us what you drank first.');
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-hydration-text', {
        body: { text, amount_oz: amount },
      });
      if (error) {
        const status = (error as any)?.context?.status;
        toast.error(
          status === 429
            ? 'Hammer is busy — try again in a moment.'
            : status === 402
              ? 'Hammer credits exhausted.'
              : error.message || 'Could not read that drink.',
        );
        return;
      }
      if (!data?.analysis) {
        toast.error('Could not read that drink.');
        return;
      }
      setAiAnalysis(data.analysis as AiHydrationAnalysis);
    } catch (e) {
      console.error('[HydrationLogger] analyze failed', e);
      toast.error('Could not read that drink.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLog = async () => {
    if (!amount || amount <= 0) {
      toast.error('Pick how much you drank.');
      return;
    }
    if (liquidType === 'other' && !aiAnalysis) {
      toast.error('Describe your drink and tap "Read this drink" first.');
      return;
    }
    setLogging(true);
    try {
      const ok = await addWater(amount, liquidType, quality, aiAnalysis ?? undefined);
      if (ok) {
        onLogged?.(amount);
        setCustomAmount('');
        setOtherText('');
        setAiAnalysis(null);
      }
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className={cn('space-y-3', dense && 'space-y-2')}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" />
          Drinks
        </Label>
        <span className="text-xs text-muted-foreground">
          {todayTotal} / {dailyGoal} oz today
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((oz) => (
          <Button
            key={oz}
            type="button"
            variant={amount === oz && !customAmount ? 'default' : 'outline'}
            size="sm"
            onClick={() => chooseAmount(oz)}
          >
            {oz}oz
          </Button>
        ))}
      </div>

      <Input
        type="number"
        inputMode="numeric"
        placeholder="Or type ounces"
        value={customAmount}
        onChange={(e) => handleCustomAmount(e.target.value)}
        className="h-9"
      />

      <div className="grid grid-cols-3 gap-2">
        {LIQUID_TYPES.map((lt) => (
          <Button
            key={lt.value}
            type="button"
            variant={liquidType === lt.value ? 'default' : 'outline'}
            size="sm"
            className="justify-start gap-1 text-xs"
            onClick={() => chooseType(lt.value)}
          >
            <span>{lt.emoji}</span>
            <span className="truncate">{lt.label}</span>
          </Button>
        ))}
      </div>

      {liquidType === 'other' && (
        <div className="space-y-2">
          <Input
            placeholder="What was it? e.g. chocolate almond milk"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            className="h-9"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full gap-2"
            disabled={analyzing}
            onClick={analyzeOther}
          >
            {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Read this drink
          </Button>
          {aiAnalysis && (
            <Badge variant="outline" className="text-xs">
              Read as {aiAnalysis.display_name}
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setQuality(quality === 'quality' ? 'filler' : 'quality')}
        >
          Counts as: {quality === 'quality' ? 'real hydration' : 'filler'} — tap to change
        </Button>
        <Button type="button" size="sm" disabled={logging} onClick={handleLog} className="gap-2">
          {logging && <Loader2 className="h-3 w-3 animate-spin" />}
          Log {amount}oz
        </Button>
      </div>
    </div>
  );
}
