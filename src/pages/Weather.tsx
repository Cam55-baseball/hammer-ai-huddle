import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WeatherWidget } from "@/components/WeatherWidget";

export default function Weather() {
  const location = useLocation();
  const [currentSport, setCurrentSport] = useState<'baseball' | 'softball'>('baseball');
  
  useEffect(() => {
    const savedSport = localStorage.getItem('selectedSport') as 'baseball' | 'softball';
    if (savedSport) {
      console.log(`Weather page: detected sport from localStorage: ${savedSport}`);
      setCurrentSport(savedSport);
    } else {
      // Fallback: detect sport from user's subscribed modules
      console.log('Weather page: no sport in localStorage, checking subscribed modules');
      const detectSportFromModules = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('subscribed_modules')
            .eq('user_id', user.id)
            .single();
          
          if (subscription?.subscribed_modules && subscription.subscribed_modules.length > 0) {
            const hasSoftball = subscription.subscribed_modules.some(m => m.startsWith('softball_'));
            const detectedSport = hasSoftball ? 'softball' : 'baseball';
            console.log(`Weather page: detected sport from modules: ${detectedSport}`);
            setCurrentSport(detectedSport);
            localStorage.setItem('selectedSport', detectedSport);
          }
        }
      };
      detectSportFromModules();
    }
  }, [location]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Weather Conditions</h1>
          <p className="text-muted-foreground">
            Check current {currentSport} weather conditions for optimal training
          </p>
        </div>

        <WeatherWidget expanded sport={currentSport} />
      </div>
    </DashboardLayout>
  );
}
