import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WeatherWidget } from "@/components/WeatherWidget";

export default function Weather() {
  const [currentSport, setCurrentSport] = useState<'baseball' | 'softball'>('baseball');
  
  useEffect(() => {
    const savedSport = localStorage.getItem('selectedSport') as 'baseball' | 'softball';
    if (savedSport) setCurrentSport(savedSport);
  }, []);

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
