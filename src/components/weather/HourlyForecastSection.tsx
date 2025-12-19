import { useTranslation } from "react-i18next";
import { Clock, Wind, CloudRain, Droplets, Sun, CloudSun, Cloud, Snowflake, Zap } from "lucide-react";

interface HourlyForecast {
  time: string;
  temperature: number;
  condition: string;
  weatherCode: number;
  windSpeed: number;
  precipitationChance: number;
  humidity: number;
}

interface HourlyForecastSectionProps {
  hourlyForecast: HourlyForecast[];
}

// Get time period label based on hour
const getTimePeriod = (hour: number, isToday: boolean): string => {
  if (hour >= 5 && hour < 12) return isToday ? 'todayMorning' : 'tomorrowMorning';
  if (hour >= 12 && hour < 17) return isToday ? 'todayAfternoon' : 'tomorrowAfternoon';
  if (hour >= 17 && hour < 21) return isToday ? 'todayEvening' : 'tomorrowEvening';
  return isToday ? 'tonight' : 'tomorrowNight';
};

// Check if it's night time (for gradient selection)
const isNightTime = (hour: number): boolean => {
  return hour >= 20 || hour < 6;
};

// Get dynamic gradient based on weather condition and time
const getHourlyCardGradient = (condition: string, hour: number, isNow: boolean): string => {
  const night = isNightTime(hour);
  const c = condition.toLowerCase();
  
  if (isNow) {
    return 'from-primary via-primary/90 to-primary/80 ring-2 ring-primary/50 ring-offset-2 ring-offset-background';
  }
  
  if (c.includes('clear') || c.includes('sunny')) {
    return night 
      ? 'from-indigo-900 via-slate-800 to-indigo-950' 
      : 'from-amber-400 via-orange-400 to-yellow-400';
  }
  if (c.includes('partly')) {
    return night 
      ? 'from-slate-700 via-indigo-800 to-slate-800' 
      : 'from-sky-400 via-blue-300 to-amber-200';
  }
  if (c.includes('cloud') || c.includes('overcast')) {
    return night 
      ? 'from-slate-800 via-gray-800 to-slate-900' 
      : 'from-slate-400 via-gray-400 to-slate-500';
  }
  if (c.includes('rain') || c.includes('drizzle')) {
    return night 
      ? 'from-slate-900 via-blue-900 to-indigo-950' 
      : 'from-blue-500 via-blue-600 to-indigo-600';
  }
  if (c.includes('storm') || c.includes('thunder')) {
    return night 
      ? 'from-slate-950 via-purple-950 to-slate-950' 
      : 'from-slate-700 via-purple-700 to-slate-800';
  }
  if (c.includes('snow') || c.includes('sleet')) {
    return night 
      ? 'from-slate-700 via-blue-800 to-slate-800' 
      : 'from-slate-200 via-blue-100 to-white';
  }
  
  return night 
    ? 'from-slate-800 via-slate-700 to-slate-800' 
    : 'from-sky-400 via-blue-400 to-sky-500';
};

// Get temperature color class
const getTemperatureColor = (temp: number): string => {
  if (temp >= 90) return 'text-red-500';
  if (temp >= 80) return 'text-orange-500';
  if (temp >= 70) return 'text-amber-500';
  if (temp >= 60) return 'text-emerald-500';
  if (temp >= 50) return 'text-sky-500';
  if (temp >= 40) return 'text-blue-500';
  return 'text-indigo-500';
};

// Get weather icon with animations
const getAnimatedWeatherIcon = (condition: string, isNow: boolean) => {
  const c = condition.toLowerCase();
  const baseClass = isNow ? 'h-10 w-10' : 'h-8 w-8';
  const dropShadow = 'drop-shadow-lg';
  
  if (c.includes('clear') || c.includes('sunny')) {
    return (
      <div className="relative">
        <Sun className={`${baseClass} text-yellow-300 ${dropShadow} animate-pulse`} />
        <div className="absolute inset-0 bg-yellow-300/30 rounded-full blur-md animate-ping" style={{ animationDuration: '2s' }} />
      </div>
    );
  }
  if (c.includes('partly')) {
    return <CloudSun className={`${baseClass} text-white ${dropShadow}`} />;
  }
  if (c.includes('cloud') || c.includes('overcast')) {
    return <Cloud className={`${baseClass} text-white/90 ${dropShadow} animate-[pulse_3s_ease-in-out_infinite]`} />;
  }
  if (c.includes('rain') || c.includes('drizzle')) {
    return (
      <div className="relative">
        <CloudRain className={`${baseClass} text-white ${dropShadow}`} />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          <div className="w-0.5 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-0.5 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-0.5 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }
  if (c.includes('storm') || c.includes('thunder')) {
    return (
      <div className="relative">
        <Zap className={`${baseClass} text-yellow-300 ${dropShadow} animate-[pulse_0.5s_ease-in-out_infinite]`} />
        <div className="absolute inset-0 bg-yellow-300/20 rounded-full blur-xl animate-ping" style={{ animationDuration: '1s' }} />
      </div>
    );
  }
  if (c.includes('snow') || c.includes('sleet')) {
    return (
      <div className="relative">
        <Snowflake className={`${baseClass} text-blue-200 ${dropShadow} animate-spin`} style={{ animationDuration: '8s' }} />
      </div>
    );
  }
  return <Cloud className={`${baseClass} text-white/90 ${dropShadow}`} />;
};

// Format time for display
const formatHourlyTime = (timeString: string, index: number, t: (key: string) => string): string => {
  if (index === 0) return t('weather.now');
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
};

// Get hour from time string
const getHourFromTime = (timeString: string): number => {
  return new Date(timeString).getHours();
};

// Check if date is today
const isToday = (timeString: string): boolean => {
  const date = new Date(timeString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export function HourlyForecastSection({ hourlyForecast }: HourlyForecastSectionProps) {
  const { t } = useTranslation();
  
  // Group forecast by time period
  const groupedForecast: { period: string; items: { hour: HourlyForecast; index: number }[] }[] = [];
  let currentPeriod = '';
  
  hourlyForecast.forEach((hour, index) => {
    const hourNum = getHourFromTime(hour.time);
    const today = isToday(hour.time);
    const period = getTimePeriod(hourNum, today);
    
    if (period !== currentPeriod) {
      currentPeriod = period;
      groupedForecast.push({ period, items: [] });
    }
    
    groupedForecast[groupedForecast.length - 1].items.push({ hour, index });
  });

  return (
    <div className="space-y-4 animate-in fade-in-50 slide-in-from-top-2 duration-300">
      <h4 className="font-bold text-lg flex items-center gap-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        {t('weather.hourlyForecastTitle')}
      </h4>
      
      {groupedForecast.map((group, groupIndex) => (
        <div key={group.period} className="space-y-3">
          {/* Time Period Header */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1 bg-muted/50 rounded-full">
              {t(`weather.${group.period}`)}
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
          </div>
          
          {/* Hourly Cards */}
          <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
              {group.items.map(({ hour, index }) => {
                const hourNum = getHourFromTime(hour.time);
                const night = isNightTime(hourNum);
                const isNow = index === 0;
                const gradient = getHourlyCardGradient(hour.condition, hourNum, isNow);
                const tempColor = getTemperatureColor(hour.temperature);
                
                return (
                  <div
                    key={hour.time}
                    className={`relative flex-shrink-0 ${isNow ? 'w-32' : 'w-28'} rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${isNow ? 'scale-105' : ''}`}
                  >
                    {/* Background decorations */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-white/10 blur-2xl" />
                      {hour.precipitationChance > 50 && (
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-500/20" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className={`relative z-10 p-3 ${isNow ? 'p-4' : ''} text-center space-y-2`}>
                      {/* NOW badge */}
                      {isNow && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-white/90 rounded-full text-[10px] font-bold text-primary uppercase tracking-wider shadow-lg">
                          {t('weather.now')}
                        </div>
                      )}
                      
                      {/* Time */}
                      <p className={`text-xs font-semibold ${night ? 'text-white/70' : 'text-white/80'} ${isNow ? 'mt-3' : ''}`}>
                        {isNow ? '' : formatHourlyTime(hour.time, index, t)}
                      </p>
                      
                      {/* Weather Icon */}
                      <div className="flex justify-center py-1">
                        {getAnimatedWeatherIcon(hour.condition, isNow)}
                      </div>
                      
                      {/* Temperature */}
                      <p className={`text-2xl font-bold ${isNow ? 'text-3xl' : ''} text-white drop-shadow-md`}>
                        {Math.round(hour.temperature)}°
                      </p>
                      
                      {/* Condition text for NOW card */}
                      {isNow && (
                        <p className="text-[10px] text-white/80 font-medium truncate px-1">
                          {hour.condition}
                        </p>
                      )}
                      
                      {/* Stats row */}
                      <div className="flex justify-center items-center gap-2 pt-1">
                        {/* Wind indicator */}
                        <div className={`flex items-center gap-0.5 text-[10px] ${night ? 'text-white/60' : 'text-white/70'}`}>
                          <Wind className={`h-3 w-3 ${hour.windSpeed > 15 ? 'animate-pulse' : ''}`} />
                          <span>{hour.windSpeed}</span>
                        </div>
                        
                        {/* Humidity */}
                        <div className={`flex items-center gap-0.5 text-[10px] ${night ? 'text-white/60' : 'text-white/70'}`}>
                          <Droplets className="h-3 w-3" />
                          <span>{hour.humidity}%</span>
                        </div>
                      </div>
                      
                      {/* Precipitation chance bar */}
                      {hour.precipitationChance > 0 && (
                        <div className="pt-1 px-1">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <CloudRain className="h-3 w-3 text-blue-200" />
                            <span className="text-[10px] text-blue-200 font-semibold">{hour.precipitationChance}%</span>
                          </div>
                          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-400 to-blue-300 rounded-full transition-all duration-500"
                              style={{ width: `${hour.precipitationChance}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* High wind warning indicator */}
                    {hour.windSpeed > 15 && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                        <div className="absolute inset-0 w-2 h-2 bg-amber-400 rounded-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
