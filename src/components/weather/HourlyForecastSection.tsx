import { useTranslation } from "react-i18next";
import { Clock, Wind, CloudRain, Droplets, Sun, CloudSun, Cloud, Snowflake, Zap, Moon, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

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
  sunrise?: string;
  sunset?: string;
}

// Parse time string like "6:45 AM" or "5:37 PM" to minutes since midnight
const parseTimeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
};

// Check if it's night time based on actual sunrise/sunset
const isNightTimeActual = (hourTime: string, sunrise?: string, sunset?: string): boolean => {
  const date = new Date(hourTime);
  const hour = date.getHours();
  const hourMinutes = hour * 60;
  
  if (sunrise && sunset) {
    const sunriseMinutes = parseTimeToMinutes(sunrise);
    const sunsetMinutes = parseTimeToMinutes(sunset);
    
    // Night is before sunrise OR after sunset
    return hourMinutes < sunriseMinutes || hourMinutes >= sunsetMinutes;
  }
  
  // Fallback: night is 8 PM to 6 AM
  return hour >= 20 || hour < 6;
};

// Get dynamic gradient based on weather condition and time
const getHourlyCardGradient = (condition: string, isNight: boolean, isNow: boolean): string => {
  const c = condition.toLowerCase();
  
  if (isNow) {
    return 'from-primary via-primary/90 to-primary/80 ring-2 ring-primary/50 ring-offset-2 ring-offset-background';
  }
  
  if (c.includes('clear') || c.includes('sunny')) {
    return isNight 
      ? 'from-indigo-900 via-slate-800 to-indigo-950' 
      : 'from-amber-400 via-orange-400 to-yellow-400';
  }
  if (c.includes('partly')) {
    return isNight 
      ? 'from-slate-700 via-indigo-800 to-slate-800' 
      : 'from-sky-400 via-blue-300 to-amber-200';
  }
  if (c.includes('cloud') || c.includes('overcast')) {
    return isNight 
      ? 'from-slate-800 via-gray-800 to-slate-900' 
      : 'from-slate-400 via-gray-400 to-slate-500';
  }
  if (c.includes('rain') || c.includes('drizzle')) {
    return isNight 
      ? 'from-slate-900 via-blue-900 to-indigo-950' 
      : 'from-blue-500 via-blue-600 to-indigo-600';
  }
  if (c.includes('storm') || c.includes('thunder')) {
    return isNight 
      ? 'from-slate-950 via-purple-950 to-slate-950' 
      : 'from-slate-700 via-purple-700 to-slate-800';
  }
  if (c.includes('snow') || c.includes('sleet')) {
    return isNight 
      ? 'from-slate-700 via-blue-800 to-slate-800' 
      : 'from-slate-200 via-blue-100 to-white';
  }
  
  return isNight 
    ? 'from-slate-800 via-slate-700 to-slate-800' 
    : 'from-sky-400 via-blue-400 to-sky-500';
};

// Get weather icon with animations - supports night mode with moon
const getAnimatedWeatherIcon = (condition: string, isNow: boolean, isNight: boolean) => {
  const c = condition.toLowerCase();
  const baseClass = isNow ? 'h-10 w-10' : 'h-8 w-8';
  const dropShadow = 'drop-shadow-lg';
  
  if (c.includes('clear') || c.includes('sunny')) {
    if (isNight) {
      return (
        <div className="relative animate-float">
          <Moon className={`${baseClass} text-yellow-100 ${dropShadow}`} />
          <div className="absolute inset-0 bg-yellow-100/20 rounded-full blur-lg animate-pulse" style={{ animationDuration: '3s' }} />
          {/* Stars around moon */}
          <div className="absolute -top-1 -right-1 w-1 h-1 bg-white rounded-full animate-twinkle" />
          <div className="absolute -bottom-2 left-0 w-0.5 h-0.5 bg-white/80 rounded-full animate-twinkle" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-0 -left-2 w-0.5 h-0.5 bg-white/60 rounded-full animate-twinkle" style={{ animationDelay: '1s' }} />
        </div>
      );
    }
    return (
      <div className="relative animate-float">
        <Sun className={`${baseClass} text-yellow-300 ${dropShadow} animate-pulse`} />
        <div className="absolute inset-0 bg-yellow-300/30 rounded-full blur-md animate-ping" style={{ animationDuration: '2s' }} />
      </div>
    );
  }
  if (c.includes('partly')) {
    if (isNight) {
      return (
        <div className="relative animate-float">
          <Cloud className={`${baseClass} text-white/90 ${dropShadow}`} />
          <Moon className="h-4 w-4 text-yellow-100 absolute -top-1 -right-1" />
        </div>
      );
    }
    return <CloudSun className={`${baseClass} text-white ${dropShadow} animate-float`} />;
  }
  if (c.includes('cloud') || c.includes('overcast')) {
    return <Cloud className={`${baseClass} text-white/90 ${dropShadow} animate-float`} style={{ animationDuration: '4s' }} />;
  }
  if (c.includes('rain') || c.includes('drizzle')) {
    return (
      <div className="relative animate-float">
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
      <div className="relative animate-float">
        <Zap className={`${baseClass} text-yellow-300 ${dropShadow} animate-[pulse_0.5s_ease-in-out_infinite]`} />
        <div className="absolute inset-0 bg-yellow-300/20 rounded-full blur-xl animate-ping" style={{ animationDuration: '1s' }} />
      </div>
    );
  }
  if (c.includes('snow') || c.includes('sleet')) {
    return (
      <div className="relative animate-float">
        <Snowflake className={`${baseClass} text-blue-200 ${dropShadow} animate-spin`} style={{ animationDuration: '8s' }} />
      </div>
    );
  }
  
  // Default - show moon at night
  if (isNight) {
    return <Moon className={`${baseClass} text-white/90 ${dropShadow} animate-float`} />;
  }
  return <Cloud className={`${baseClass} text-white/90 ${dropShadow} animate-float`} />;
};

// Format time for display
const formatHourlyTime = (timeString: string): string => {
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

// Get time period for inline label
const getTimePeriodLabel = (hour: number, today: boolean, t: (key: string) => string): string => {
  if (hour >= 5 && hour < 12) return t(today ? 'weather.todayMorning' : 'weather.tomorrowMorning');
  if (hour >= 12 && hour < 17) return t(today ? 'weather.todayAfternoon' : 'weather.tomorrowAfternoon');
  if (hour >= 17 && hour < 21) return t(today ? 'weather.todayEvening' : 'weather.tomorrowEvening');
  return t(today ? 'weather.tonight' : 'weather.tomorrowNight');
};

// Get period boundaries for showing labels inline
const getPeriodKey = (hour: number, today: boolean): string => {
  const dayPrefix = today ? 'today' : 'tomorrow';
  if (hour >= 5 && hour < 12) return `${dayPrefix}-morning`;
  if (hour >= 12 && hour < 17) return `${dayPrefix}-afternoon`;
  if (hour >= 17 && hour < 21) return `${dayPrefix}-evening`;
  return `${dayPrefix}-night`;
};

export function HourlyForecastSection({ hourlyForecast, sunrise, sunset }: HourlyForecastSectionProps) {
  const { t } = useTranslation();
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  
  // Hide swipe hint after a few seconds or on scroll
  useEffect(() => {
    const timer = setTimeout(() => setShowSwipeHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  
  // Track period changes for inline labels
  let lastPeriodKey = '';
  const forecastWithLabels = hourlyForecast.map((hour, index) => {
    const hourNum = getHourFromTime(hour.time);
    const today = isToday(hour.time);
    const periodKey = getPeriodKey(hourNum, today);
    const showPeriodLabel = periodKey !== lastPeriodKey;
    lastPeriodKey = periodKey;
    
    return {
      hour,
      index,
      showPeriodLabel,
      periodLabel: showPeriodLabel ? getTimePeriodLabel(hourNum, today, t) : ''
    };
  });

  const handleScroll = () => {
    if (showSwipeHint) setShowSwipeHint(false);
  };

  return (
    <div className="space-y-3 animate-in fade-in-50 slide-in-from-top-2 duration-300">
      <h4 className="font-bold text-lg flex items-center gap-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        {t('weather.hourlyForecastTitle')}
      </h4>
      
      {/* Single continuous horizontal scroll with swipe hint */}
      <div className="relative">
        <div 
          className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory scroll-smooth"
          onScroll={handleScroll}
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <style>{`
            .scrollbar-hide::-webkit-scrollbar { display: none; }
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
            @keyframes twinkle {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }
            @keyframes rainDrop {
              0% { transform: translateY(-8px) rotate(15deg); opacity: 0; }
              20% { opacity: 1; }
              100% { transform: translateY(70px) rotate(15deg); opacity: 0; }
            }
            @keyframes snowFall {
              0% { transform: translateY(-8px) translateX(0) rotate(0deg); opacity: 0; }
              20% { opacity: 0.9; }
              50% { transform: translateY(30px) translateX(4px) rotate(180deg); opacity: 0.7; }
              100% { transform: translateY(70px) translateX(-4px) rotate(360deg); opacity: 0; }
            }
            .animate-float { animation: float 3s ease-in-out infinite; }
            .animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
            .animate-rain { animation: rainDrop 0.8s linear infinite; }
            .animate-snow { animation: snowFall 2.5s ease-in-out infinite; }
          `}</style>
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {forecastWithLabels.map(({ hour, index, showPeriodLabel, periodLabel }) => {
              const isNight = isNightTimeActual(hour.time, sunrise, sunset);
              const isNow = index === 0;
              const gradient = getHourlyCardGradient(hour.condition, isNight, isNow);
              
              // Staggered animation delay based on index
              const animationDelay = `${index * 50}ms`;
              
              return (
                <div 
                  key={hour.time} 
                  className="flex items-end gap-3 snap-start animate-in fade-in-0 slide-in-from-bottom-4"
                  style={{ animationDelay, animationDuration: '400ms', animationFillMode: 'backwards' }}
                >
                  {/* Inline period label separator */}
                  {showPeriodLabel && index !== 0 && (
                    <div className="flex flex-col items-center justify-center h-full py-2">
                      <div className="h-8 w-px bg-border/50" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap px-1 py-1 writing-mode-vertical" 
                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                        {periodLabel}
                      </span>
                      <div className="h-8 w-px bg-border/50" />
                    </div>
                  )}
                  
                  {/* Hourly Card with enhanced animations */}
                  <div
                    className={`relative flex-shrink-0 ${isNow ? 'w-32' : 'w-28'} rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 ${isNow ? 'scale-105' : ''}`}
                  >
                    {/* Background decorations */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className={`absolute -top-4 -right-4 h-16 w-16 rounded-full ${isNight ? 'bg-white/5' : 'bg-white/10'} blur-2xl`} />
                      {hour.precipitationChance > 50 && (
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-500/20" />
                      )}
                      {/* Night stars decoration */}
                      {isNight && (
                        <>
                          <div className="absolute top-3 left-3 w-0.5 h-0.5 bg-white/40 rounded-full animate-twinkle" />
                          <div className="absolute top-5 right-4 w-0.5 h-0.5 bg-white/30 rounded-full animate-twinkle" style={{ animationDelay: '0.7s' }} />
                          <div className="absolute bottom-8 left-4 w-0.5 h-0.5 bg-white/20 rounded-full animate-twinkle" style={{ animationDelay: '1.2s' }} />
                        </>
                      )}
                      
                      {/* Rain precipitation overlay */}
                      {hour.precipitationChance >= 30 && (hour.condition.toLowerCase().includes('rain') || hour.condition.toLowerCase().includes('drizzle') || hour.condition.toLowerCase().includes('shower')) && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          {Array.from({ length: Math.min(Math.floor(hour.precipitationChance / 10), 12) }).map((_, i) => (
                            <div
                              key={`rain-${i}`}
                              className="absolute w-0.5 h-3 bg-gradient-to-b from-transparent via-blue-300/80 to-blue-400/60 rounded-full animate-rain"
                              style={{
                                left: `${10 + (i * 8)}%`,
                                animationDelay: `${i * 0.12}s`,
                                animationDuration: `${0.6 + Math.random() * 0.4}s`
                              }}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Snow precipitation overlay */}
                      {hour.precipitationChance >= 30 && (hour.condition.toLowerCase().includes('snow') || hour.condition.toLowerCase().includes('sleet') || hour.condition.toLowerCase().includes('flurr')) && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          {Array.from({ length: Math.min(Math.floor(hour.precipitationChance / 12), 10) }).map((_, i) => (
                            <div
                              key={`snow-${i}`}
                              className="absolute w-1.5 h-1.5 bg-white/80 rounded-full animate-snow"
                              style={{
                                left: `${8 + (i * 10)}%`,
                                animationDelay: `${i * 0.3}s`,
                                animationDuration: `${2 + Math.random() * 1.5}s`
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className={`relative z-10 p-3 ${isNow ? 'p-4' : ''} text-center space-y-2`}>
                      {/* NOW badge */}
                      {isNow && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-white/90 rounded-full text-[10px] font-bold text-primary uppercase tracking-wider shadow-lg animate-pulse">
                          {t('weather.now')}
                        </div>
                      )}
                      
                      {/* Time */}
                      <p className={`text-xs font-semibold ${isNight ? 'text-white/70' : 'text-white/80'} ${isNow ? 'mt-3' : ''}`}>
                        {isNow ? '' : formatHourlyTime(hour.time)}
                      </p>
                      
                      {/* Weather Icon */}
                      <div className="flex justify-center py-1">
                        {getAnimatedWeatherIcon(hour.condition, isNow, isNight)}
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
                        <div className={`flex items-center gap-0.5 text-[10px] ${isNight ? 'text-white/60' : 'text-white/70'}`}>
                          <Wind className={`h-3 w-3 ${hour.windSpeed > 15 ? 'animate-pulse' : ''}`} />
                          <span>{hour.windSpeed}</span>
                        </div>
                        
                        {/* Humidity */}
                        <div className={`flex items-center gap-0.5 text-[10px] ${isNight ? 'text-white/60' : 'text-white/70'}`}>
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
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Swipe hint overlay */}
        {showSwipeHint && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-gradient-to-l from-background via-background/90 to-transparent pl-8 pr-2 py-4 animate-pulse pointer-events-none">
            <span className="text-xs text-muted-foreground font-medium">{t('weather.swipe')}</span>
            <div className="flex">
              <ChevronRight className="h-4 w-4 text-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 -ml-2 animate-bounce" style={{ animationDelay: '100ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
