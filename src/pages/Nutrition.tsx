import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Apple, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NutritionDisclaimer } from '@/components/NutritionDisclaimer';
import { DailyTipHero } from '@/components/DailyTipHero';
import { NutritionCategory } from '@/components/NutritionCategory';
import { useAuth } from '@/hooks/useAuth';

export default function Nutrition() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [currentSport, setCurrentSport] = useState<'baseball' | 'softball'>(() => {
    const saved = localStorage.getItem('selectedSport');
    return (saved === 'baseball' || saved === 'softball') ? saved : 'baseball';
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/dashboard')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400">
              <Apple className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Iron Horse Production</h1>
              <p className="text-sm text-muted-foreground">Dietary & Holistic Health for Elite Athletes</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <NutritionDisclaimer />

        {/* Daily Tip */}
        <DailyTipHero sport={currentSport} />

        {/* Categories */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>Nutrition Categories</span>
            <span className="text-xs text-muted-foreground font-normal">(18 topics)</span>
          </h2>
          <NutritionCategory />
        </div>
      </div>
    </DashboardLayout>
  );
}
