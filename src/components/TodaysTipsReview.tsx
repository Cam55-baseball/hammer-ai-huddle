import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Heart, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useVault } from '@/hooks/useVault';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TodayTip {
  id: string;
  tip_text: string;
  category: string;
  categoryName: string;
  is_ai_generated: boolean;
  sport: string | null;
  viewed_at: string;
}

export function TodaysTipsReview() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { saveTip, savedTips, fetchSavedItems } = useVault();
  
  const [tips, setTips] = useState<TodayTip[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedTipIds, setSavedTipIds] = useState<Set<string>>(new Set());

  const fetchTodaysTips = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('get-today-tips');
      
      if (error) {
        console.error('Error fetching today tips:', error);
        return;
      }

      setTips(data?.tips || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTodaysTips();
  }, [fetchTodaysTips]);

  useEffect(() => {
    // Check which tips are already saved
    if (savedTips && tips.length > 0) {
      const saved = new Set<string>();
      tips.forEach(tip => {
        const isSaved = savedTips.some(
          st => st.tip_text === tip.tip_text && st.module_origin === 'nutrition'
        );
        if (isSaved) saved.add(tip.id);
      });
      setSavedTipIds(saved);
    }
  }, [savedTips, tips]);

  const handleSaveTip = async (tip: TodayTip) => {
    if (savedTipIds.has(tip.id)) return;

    const result = await saveTip({
      tip_text: tip.tip_text,
      tip_category: tip.categoryName,
      module_origin: 'nutrition',
    });

    if (result.success) {
      setSavedTipIds(prev => new Set([...prev, tip.id]));
      toast.success(t('nutrition.tipSavedSuccess'));
      fetchSavedItems();
    } else if (result.error === 'already_saved') {
      setSavedTipIds(prev => new Set([...prev, tip.id]));
      toast.info(t('nutrition.tipSaved'));
    } else {
      toast.error(t('common.error'));
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading || tips.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{t('nutrition.todaysTipsCount', { count: tips.length })}</span>
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('nutrition.reviewTips')}</p>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 pb-2">
              <Heart className="h-4 w-4" />
              {t('nutrition.tipSaveHint')}
            </p>
            {tips.map((tip, index) => {
              const isSaved = savedTipIds.has(tip.id);
              
              return (
                <div
                  key={tip.id}
                  className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {tip.categoryName}
                      </Badge>
                      {tip.is_ai_generated && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          AI
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(tip.viewed_at)}
                      </span>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveTip(tip)}
                      disabled={isSaved}
                      className={`h-8 w-8 p-0 flex-shrink-0 ${isSaved ? 'text-red-500' : 'hover:text-red-500'}`}
                    >
                      <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                  
                  <p className="text-sm leading-relaxed">{tip.tip_text}</p>
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
