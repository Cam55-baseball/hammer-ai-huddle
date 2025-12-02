import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WeatherWidget } from "@/components/WeatherWidget";
import { Wind, Cloud, Sparkles } from "lucide-react";

export default function Weather() {
  const location = useLocation();
  const [currentSport, setCurrentSport] = useState<'baseball' | 'softball'>(() => {
    const saved = localStorage.getItem('selectedSport');
    if (saved === 'baseball' || saved === 'softball') {
      return saved as 'baseball' | 'softball';
    }
    return 'baseball';
  });
  
  useEffect(() => {
    const savedSport = localStorage.getItem('selectedSport') as 'baseball' | 'softball';
    if (savedSport) {
      console.log(`Weather page: detected sport from localStorage: ${savedSport}`);
      setCurrentSport(savedSport);
    } else {
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
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
            <Cloud className="absolute top-4 right-8 h-16 w-16 text-white/10 animate-pulse" />
            <Wind className="absolute bottom-4 left-8 h-12 w-12 text-white/10" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Wind className="h-6 w-6" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Playing The Elements
              </h1>
            </div>
            <p className="text-blue-100 text-base sm:text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Master every {currentSport} game-day condition • Train smarter, play harder
            </p>
          </div>
        </div>

        <WeatherWidget expanded sport={currentSport} />
      </div>
    </DashboardLayout>
  );
}
