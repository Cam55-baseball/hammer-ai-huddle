import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Compass, Thermometer, Shield, Wind, Clock, Cloud, CloudRain, CloudSun, Snowflake, Zap, CheckCircle2, Lightbulb, Copy, Droplets, AlertTriangle, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface HourlyForecast {
  time: string;
  temperature: number;
  condition: string;
  weatherCode: number;
  windSpeed: number;
  precipitationChance: number;
  humidity: number;
}

interface GameDayPrepProps {
  sunrise: string;
  sunset: string;
  sport?: 'baseball' | 'softball';
  temperature?: number;
  uvIndex?: number;
  windSpeed?: number;
  hourlyForecast?: HourlyForecast[];
}

type FieldDirection = 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest';

// Parse time string like "6:45 AM" to minutes since midnight
const parseTimeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
};

// Calculate sun azimuth based on current time (simplified)
const getSunAzimuth = (currentMinutes: number, sunriseMinutes: number, sunsetMinutes: number): number => {
  const dayLength = sunsetMinutes - sunriseMinutes;
  const timeSinceSunrise = currentMinutes - sunriseMinutes;
  
  if (currentMinutes < sunriseMinutes || currentMinutes > sunsetMinutes) {
    return currentMinutes < sunriseMinutes ? 90 : 270;
  }
  
  const progress = timeSinceSunrise / dayLength;
  return 90 + (progress * 180);
};

// Get relative sun position based on field direction and sun azimuth
const getRelativeSunPosition = (sunAzimuth: number, fieldDirection: FieldDirection): { x: number; y: number; label: string } => {
  const fieldAngles: Record<FieldDirection, number> = {
    north: 0,
    northeast: 45,
    east: 90,
    southeast: 135,
    south: 180,
    southwest: 225,
    west: 270,
    northwest: 315
  };
  
  const fieldAngle = fieldAngles[fieldDirection];
  const relativeAngle = sunAzimuth - fieldAngle;
  const normalizedAngle = ((relativeAngle % 360) + 360) % 360;
  
  const radians = (normalizedAngle - 90) * (Math.PI / 180);
  const x = 50 + Math.cos(radians) * 38;
  const y = 50 + Math.sin(radians) * 38;
  
  let label = '';
  if (normalizedAngle >= 315 || normalizedAngle < 45) label = 'behind home plate';
  else if (normalizedAngle >= 45 && normalizedAngle < 135) label = 'right field side';
  else if (normalizedAngle >= 135 && normalizedAngle < 225) label = 'center field';
  else label = 'left field side';
  
  return { x, y, label };
};

// Get warmup recommendations based on temperature
const getWarmupRecommendations = (temperature: number, t: any): {
  category: string;
  duration: string;
  exercises: string[];
  tip: string;
  icon: string;
  color: string;
} => {
  if (temperature < 45) {
    return {
      category: 'cold',
      duration: t('weather.gameDayPrep.coldWarmupDuration'),
      exercises: [
        t('weather.gameDayPrep.coldWarmupExercise1'),
        t('weather.gameDayPrep.coldWarmupExercise2'),
        t('weather.gameDayPrep.coldWarmupExercise3'),
        t('weather.gameDayPrep.coldWarmupExercise4'),
      ],
      tip: t('weather.gameDayPrep.coldWarmupTip'),
      icon: '🥶',
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    };
  } else if (temperature < 60) {
    return {
      category: 'cool',
      duration: t('weather.gameDayPrep.coolWarmupDuration'),
      exercises: [
        t('weather.gameDayPrep.coolWarmupExercise1'),
        t('weather.gameDayPrep.coolWarmupExercise2'),
        t('weather.gameDayPrep.coolWarmupExercise3'),
        t('weather.gameDayPrep.coolWarmupExercise4'),
      ],
      tip: t('weather.gameDayPrep.coolWarmupTip'),
      icon: '🧥',
      color: 'text-sky-600 bg-sky-50 border-sky-200'
    };
  } else if (temperature < 75) {
    return {
      category: 'moderate',
      duration: t('weather.gameDayPrep.moderateWarmupDuration'),
      exercises: [
        t('weather.gameDayPrep.moderateWarmupExercise1'),
        t('weather.gameDayPrep.moderateWarmupExercise2'),
        t('weather.gameDayPrep.moderateWarmupExercise3'),
        t('weather.gameDayPrep.moderateWarmupExercise4'),
      ],
      tip: t('weather.gameDayPrep.moderateWarmupTip'),
      icon: '👍',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    };
  } else if (temperature < 85) {
    return {
      category: 'warm',
      duration: t('weather.gameDayPrep.warmWarmupDuration'),
      exercises: [
        t('weather.gameDayPrep.warmWarmupExercise1'),
        t('weather.gameDayPrep.warmWarmupExercise2'),
        t('weather.gameDayPrep.warmWarmupExercise3'),
        t('weather.gameDayPrep.warmWarmupExercise4'),
      ],
      tip: t('weather.gameDayPrep.warmWarmupTip'),
      icon: '☀️',
      color: 'text-amber-600 bg-amber-50 border-amber-200'
    };
  }
  return {
    category: 'hot',
    duration: t('weather.gameDayPrep.hotWarmupDuration'),
    exercises: [
      t('weather.gameDayPrep.hotWarmupExercise1'),
      t('weather.gameDayPrep.hotWarmupExercise2'),
      t('weather.gameDayPrep.hotWarmupExercise3'),
      t('weather.gameDayPrep.hotWarmupExercise4'),
    ],
    tip: t('weather.gameDayPrep.hotWarmupTip'),
    icon: '🥵',
    color: 'text-red-600 bg-red-50 border-red-200'
  };
};

// Get temperature-based outfit recommendations
const getTemperatureGear = (temperature: number | undefined, t: any): { text: string; icon: string } => {
  if (temperature === undefined) return { text: t('weather.gameDayPrep.noTempData'), icon: '🌡️' };
  
  if (temperature < 45) {
    return { text: t('weather.gameDayPrep.coldWeatherGear'), icon: '🧤' };
  } else if (temperature < 60) {
    return { text: t('weather.gameDayPrep.coolWeatherGear'), icon: '🧥' };
  } else if (temperature < 75) {
    return { text: t('weather.gameDayPrep.moderateWeatherGear'), icon: '👕' };
  } else if (temperature < 85) {
    return { text: t('weather.gameDayPrep.warmWeatherGear'), icon: '🩳' };
  }
  return { text: t('weather.gameDayPrep.hotWeatherGear'), icon: '💦' };
};

// Get UV-based protection recommendations
const getUVProtection = (uvIndex: number | undefined, t: any): { text: string; icon: string; level: string } => {
  if (uvIndex === undefined) return { text: t('weather.gameDayPrep.noUVData'), icon: '☀️', level: 'unknown' };
  
  if (uvIndex <= 2) {
    return { text: t('weather.gameDayPrep.uvLow'), icon: '😎', level: 'low' };
  } else if (uvIndex <= 5) {
    return { text: t('weather.gameDayPrep.uvModerate'), icon: '🧴', level: 'moderate' };
  } else if (uvIndex <= 7) {
    return { text: t('weather.gameDayPrep.uvHigh'), icon: '⚠️', level: 'high' };
  } else if (uvIndex <= 10) {
    return { text: t('weather.gameDayPrep.uvVeryHigh'), icon: '🛡️', level: 'very-high' };
  }
  return { text: t('weather.gameDayPrep.uvExtreme'), icon: '🚨', level: 'extreme' };
};

// Get wind-based gear recommendations
const getWindGear = (windSpeed: number | undefined, t: any): { text: string; icon: string } => {
  if (windSpeed === undefined) return { text: t('weather.gameDayPrep.noWindData'), icon: '💨' };
  
  if (windSpeed < 10) {
    return { text: t('weather.gameDayPrep.windLight'), icon: '✓' };
  } else if (windSpeed < 20) {
    return { text: t('weather.gameDayPrep.windModerate'), icon: '🌬️' };
  }
  return { text: t('weather.gameDayPrep.windStrong'), icon: '💨' };
};

// Format hour option for dropdown
const formatHourOption = (time: string, index: number, t: any): string => {
  if (index === 0) return t('weather.gameDayPrep.now');
  const date = new Date(time);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  
  if (isToday) return `${t('weather.gameDayPrep.today')} ${timeStr}`;
  if (isTomorrow) return `${t('weather.gameDayPrep.tomorrow')} ${timeStr}`;
  return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${timeStr}`;
};

// Check if time is night based on sunrise/sunset
const isNightTime = (hourTime: string, sunrise: string, sunset: string): boolean => {
  const date = new Date(hourTime);
  const hour = date.getHours();
  const hourMinutes = hour * 60;
  
  const sunriseMinutes = parseTimeToMinutes(sunrise);
  const sunsetMinutes = parseTimeToMinutes(sunset);
  
  return hourMinutes < sunriseMinutes || hourMinutes >= sunsetMinutes;
};

// Get condition icon component with night mode support
const getConditionIcon = (condition: string, size: string = 'h-4 w-4', isNight: boolean = false) => {
  const c = condition.toLowerCase();
  
  // Clear/sunny - show moon at night
  if (c.includes('clear') || c.includes('sunny')) {
    return isNight 
      ? <Moon className={`${size} text-yellow-200`} />
      : <Sun className={`${size} text-amber-500`} />;
  }
  
  // Partly cloudy - show moon with cloud at night
  if (c.includes('partly')) {
    return isNight 
      ? <div className="relative inline-flex items-center">
          <Cloud className={`${size} text-gray-400`} />
          <Moon className="h-2.5 w-2.5 text-yellow-200 absolute -top-0.5 -right-1" />
        </div>
      : <CloudSun className={`${size} text-sky-500`} />;
  }
  
  if (c.includes('cloud') || c.includes('overcast')) return <Cloud className={`${size} text-gray-500`} />;
  if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className={`${size} text-blue-500`} />;
  if (c.includes('storm') || c.includes('thunder')) return <Zap className={`${size} text-purple-500`} />;
  if (c.includes('snow') || c.includes('sleet')) return <Snowflake className={`${size} text-blue-400`} />;
  
  // Default - show moon at night for unknown conditions
  return isNight 
    ? <Moon className={`${size} text-gray-400`} />
    : <Cloud className={`${size} text-gray-500`} />;
};

// Get sun impact positions
const getSunImpactPositions = (sunPosition: { label: string }, isNight: boolean, t: any): string[] => {
  if (isNight) return [t('weather.gameDayPrep.sunBelowHorizon')];
  
  const positions: string[] = [];
  if (sunPosition.label === 'behind home plate') {
    positions.push(`${t('weather.gameDayPrep.pitcher')} ${t('weather.gameDayPrep.mayHaveSunGlare')}`);
    positions.push(`${t('weather.gameDayPrep.catcher')} ${t('weather.gameDayPrep.mayHaveSunGlare')}`);
  } else if (sunPosition.label === 'center field') {
    positions.push(`${t('weather.gameDayPrep.batter')} ${t('weather.gameDayPrep.mayHaveSunGlare')}`);
  } else if (sunPosition.label === 'left field side') {
    positions.push(`${t('weather.gameDayPrep.leftFielder')} ${t('weather.gameDayPrep.mayHaveSunGlare')}`);
    positions.push(`${t('weather.gameDayPrep.shortstop')} ${t('weather.gameDayPrep.mayHaveSunGlare')}`);
  } else if (sunPosition.label === 'right field side') {
    positions.push(`${t('weather.gameDayPrep.rightFielder')} ${t('weather.gameDayPrep.mayHaveSunGlare')}`);
    positions.push(`${t('weather.gameDayPrep.secondBase')} ${t('weather.gameDayPrep.mayHaveSunGlare')}`);
  }
  
  if (positions.length === 0) {
    positions.push(t('weather.gameDayPrep.noSunIssues'));
  }
  
  return positions;
};

export function GameDayPrep({ sunrise, sunset, sport = 'baseball', temperature, uvIndex, windSpeed, hourlyForecast }: GameDayPrepProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [fieldDirection, setFieldDirection] = useState<FieldDirection>('north');
  const [selectedHourIndex, setSelectedHourIndex] = useState(0);
  
  const currentTime = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);
  
  // Get selected hour data
  const selectedForecast = hourlyForecast?.[selectedHourIndex];
  
  // Use selected hour's data or fall back to props
  const activeTemperature = selectedForecast?.temperature ?? temperature;
  const activeWindSpeed = selectedForecast?.windSpeed ?? windSpeed;
  const activeCondition = selectedForecast?.condition ?? 'Clear';
  const activePrecipitationChance = selectedForecast?.precipitationChance ?? 0;
  
  // Calculate time for sun position based on selected hour
  const selectedTimeMinutes = useMemo(() => {
    if (selectedForecast?.time) {
      const date = new Date(selectedForecast.time);
      return date.getHours() * 60 + date.getMinutes();
    }
    return currentTime;
  }, [selectedForecast, currentTime]);
  
  const sunriseMinutes = parseTimeToMinutes(sunrise);
  const sunsetMinutes = parseTimeToMinutes(sunset);
  const sunAzimuth = getSunAzimuth(selectedTimeMinutes, sunriseMinutes, sunsetMinutes);
  const sunPosition = getRelativeSunPosition(sunAzimuth, fieldDirection);
  
  const isNight = selectedTimeMinutes < sunriseMinutes || selectedTimeMinutes > sunsetMinutes;
  
  // Get recommendations based on active (selected hour) data
  const warmup = activeTemperature !== undefined ? getWarmupRecommendations(activeTemperature, t) : null;
  const tempGear = getTemperatureGear(activeTemperature, t);
  const uvProtection = getUVProtection(uvIndex, t);
  const windGear = getWindGear(activeWindSpeed, t);
  const sunImpactPositions = getSunImpactPositions(sunPosition, isNight, t);
  
  // Get precipitation warning info
  const getPrecipitationWarning = (chance: number): { level: 'low' | 'moderate' | 'high'; message: string; color: string } | null => {
    if (chance < 30) return null;
    if (chance < 50) return { level: 'low', message: t('weather.gameDayPrep.precipitationPossible'), color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700' };
    if (chance < 70) return { level: 'moderate', message: t('weather.gameDayPrep.precipitationLikely'), color: 'bg-orange-500/10 border-orange-500/30 text-orange-700' };
    return { level: 'high', message: t('weather.gameDayPrep.precipitationHigh'), color: 'bg-destructive/10 border-destructive/30 text-destructive' };
  };
  
  const precipWarning = getPrecipitationWarning(activePrecipitationChance);
  
  // Generate shareable text for clipboard
  const generateShareableText = (): string => {
    const timeLabel = selectedForecast ? formatHourOption(selectedForecast.time, selectedHourIndex, t) : t('weather.gameDayPrep.now');
    
    let text = `🧢 GAME DAY PREP - ${timeLabel}\n`;
    text += `📍 ${Math.round(activeTemperature ?? 0)}°F • ${activeCondition} • ${Math.round(activeWindSpeed ?? 0)} mph Wind\n\n`;
    
    if (precipWarning) {
      text += `⚠️ PRECIPITATION WARNING\n`;
      text += `☔ ${activePrecipitationChance}% chance of rain\n`;
      text += `${precipWarning.message}\n\n`;
    }
    
    if (warmup) {
      text += `🏃 PRE-GAME WARMUP (${warmup.duration})\n`;
      warmup.exercises.forEach(ex => {
        text += `✓ ${ex}\n`;
      });
      text += `💡 Tip: ${warmup.tip}\n\n`;
    }
    
    text += `👕 OUTFIT & GEAR\n`;
    text += `🌡️ Temperature (${Math.round(activeTemperature ?? 0)}°F): ${tempGear.text}\n`;
    text += `☀️ UV Protection${uvIndex !== undefined ? ` (UV ${uvIndex})` : ''}: ${uvProtection.text}\n`;
    text += `💨 Wind (${Math.round(activeWindSpeed ?? 0)} mph): ${windGear.text}\n\n`;
    
    if (!isNight && sunImpactPositions.length > 0) {
      text += `☀️ SUN IMPACT ANALYSIS\n`;
      sunImpactPositions.forEach(pos => {
        text += `• ${pos}\n`;
      });
      text += `\n`;
    }
    
    text += `🧭 Field Direction: ${fieldDirection.charAt(0).toUpperCase() + fieldDirection.slice(1)}`;
    
    return text;
  };
  
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateShareableText());
      toast({
        title: t('weather.gameDayPrep.copiedToClipboard'),
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg animate-in fade-in-50 slide-in-from-top-2 duration-300">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-lg flex items-center gap-2">
            <Compass className="h-5 w-5" />
            {t('weather.gameDayPrep.title')}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 px-2"
            onClick={handleCopyToClipboard}
          >
            <Copy className="h-4 w-4 mr-1.5" />
            {t('weather.gameDayPrep.copyToClipboard')}
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Selectors Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Hour Selector */}
          {hourlyForecast && hourlyForecast.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {t('weather.gameDayPrep.selectGameTime')}
              </label>
              <Select 
                value={selectedHourIndex.toString()} 
                onValueChange={(v) => setSelectedHourIndex(parseInt(v))}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {selectedForecast && getConditionIcon(
                        selectedForecast.condition, 
                        'h-4 w-4', 
                        isNightTime(selectedForecast.time, sunrise, sunset)
                      )}
                      <span className="truncate">
                        {selectedForecast 
                          ? `${formatHourOption(selectedForecast.time, selectedHourIndex, t)} • ${Math.round(selectedForecast.temperature)}°F`
                          : t('weather.gameDayPrep.now')
                        }
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card border border-border z-50 max-h-[300px]">
                  {hourlyForecast.slice(0, 33).map((hour, idx) => {
                    const hourIsNight = isNightTime(hour.time, sunrise, sunset);
                    return (
                      <SelectItem key={idx} value={idx.toString()}>
                        <div className="flex items-center gap-2 py-0.5">
                          {getConditionIcon(hour.condition, 'h-4 w-4', hourIsNight)}
                          <span className="flex-1">{formatHourOption(hour.time, idx, t)}</span>
                          <span className="font-semibold">{Math.round(hour.temperature)}°F</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Field Direction Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5" />
              {t('weather.gameDayPrep.fieldDirection')}
            </label>
            <Select value={fieldDirection} onValueChange={(v) => setFieldDirection(v as FieldDirection)}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-50">
                <SelectItem value="north">{t('weather.gameDayPrep.north')}</SelectItem>
                <SelectItem value="northeast">{t('weather.gameDayPrep.northeast')}</SelectItem>
                <SelectItem value="east">{t('weather.gameDayPrep.east')}</SelectItem>
                <SelectItem value="southeast">{t('weather.gameDayPrep.southeast')}</SelectItem>
                <SelectItem value="south">{t('weather.gameDayPrep.south')}</SelectItem>
                <SelectItem value="southwest">{t('weather.gameDayPrep.southwest')}</SelectItem>
                <SelectItem value="west">{t('weather.gameDayPrep.west')}</SelectItem>
                <SelectItem value="northwest">{t('weather.gameDayPrep.northwest')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Current Conditions Summary */}
        {selectedForecast && (
          <div className="flex items-center justify-center gap-3 py-2 px-4 bg-muted/50 rounded-lg">
            {getConditionIcon(activeCondition, 'h-5 w-5')}
            <span className="text-sm font-medium">
              {Math.round(activeTemperature ?? 0)}°F
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{activeCondition}</span>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-1">
              <Wind className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{Math.round(activeWindSpeed ?? 0)} mph</span>
            </div>
          </div>
        )}
        
        {/* Precipitation Warning */}
        {precipWarning && (
          <div className={`flex items-start gap-3 p-3 rounded-lg border ${precipWarning.color}`}>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-current/10">
              {precipWarning.level === 'high' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Droplets className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold">
                  {t('weather.gameDayPrep.precipitationWarning')}
                </p>
                <Badge variant="outline" className="text-xs">
                  {activePrecipitationChance}% {t('weather.gameDayPrep.rainChance')}
                </Badge>
              </div>
              <p className="text-sm opacity-90">{precipWarning.message}</p>
            </div>
          </div>
        )}
        
        {/* Baseball Field Graphic with Sun Position */}
        <div className="relative aspect-square max-w-[280px] mx-auto">
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="outfieldGrass" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(120 45% 35%)" />
                <stop offset="100%" stopColor="hsl(120 50% 28%)" />
              </linearGradient>
              <linearGradient id="infieldGrass" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(120 50% 38%)" />
                <stop offset="100%" stopColor="hsl(120 45% 32%)" />
              </linearGradient>
              <linearGradient id="infieldDirt" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(28 55% 52%)" />
                <stop offset="100%" stopColor="hsl(28 50% 44%)" />
              </linearGradient>
              <linearGradient id="warningTrack" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(28 40% 48%)" />
                <stop offset="100%" stopColor="hsl(28 35% 40%)" />
              </linearGradient>
              <pattern id="mowPattern" width="12" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
                <rect width="6" height="200" fill="hsl(120 48% 36%)" />
                <rect x="6" width="6" height="200" fill="hsl(120 45% 32%)" />
              </pattern>
              <radialGradient id="sunGlow">
                <stop offset="0%" stopColor="hsl(45 100% 70%)" stopOpacity="0.9" />
                <stop offset="50%" stopColor="hsl(45 100% 60%)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(45 100% 55%)" stopOpacity="0" />
              </radialGradient>
              <clipPath id="innerGrassClip">
                <path d="M 100 180 L 15 85 Q 15 15 100 15 Q 185 15 185 85 L 100 180 Z" />
              </clipPath>
            </defs>
            
            <rect width="200" height="200" fill="hsl(var(--muted))" rx="8" />
            <path d="M 100 188 L 2 88 Q 2 2 100 2 Q 198 2 198 88 L 100 188 Z" fill="hsl(150 25% 25%)" stroke="hsl(150 20% 20%)" strokeWidth="2" />
            <path d="M 100 185 L 5 88 Q 5 5 100 5 Q 195 5 195 88 L 100 185 Z" fill="url(#warningTrack)" />
            <path d="M 100 178 L 15 85 Q 15 15 100 15 Q 185 15 185 85 L 100 178 Z" fill="url(#outfieldGrass)" />
            <g clipPath="url(#innerGrassClip)">
              <rect x="0" y="0" width="200" height="200" fill="url(#mowPattern)" opacity="0.6" />
            </g>
            <ellipse cx="100" cy="148" rx="52" ry="38" fill="url(#infieldGrass)" />
            <path d="M 100 182 L 52 138 Q 48 130 52 122 L 100 82 L 148 122 Q 152 130 148 138 L 100 182 Z" fill="url(#infieldDirt)" />
            <ellipse cx="100" cy="176" rx="18" ry="12" fill="url(#infieldDirt)" />
            <ellipse cx="100" cy="135" rx="12" ry="9" fill="hsl(28 45% 55%)" />
            <line x1="100" y1="178" x2="8" y2="86" stroke="white" strokeWidth="2" opacity="0.95" />
            <line x1="100" y1="178" x2="192" y2="86" stroke="white" strokeWidth="2" opacity="0.95" />
            <line x1="100" y1="174" x2="55" y2="135" stroke="white" strokeWidth="1.5" opacity="0.85" />
            <line x1="55" y1="135" x2="100" y2="96" stroke="white" strokeWidth="1.5" opacity="0.85" />
            <line x1="100" y1="96" x2="145" y2="135" stroke="white" strokeWidth="1.5" opacity="0.85" />
            <line x1="145" y1="135" x2="100" y2="174" stroke="white" strokeWidth="1.5" opacity="0.85" />
            <rect x="96" y="133" width="8" height="2" fill="white" rx="0.5" />
            <polygon points="100,176 94,172 94,167 106,167 106,172" fill="white" stroke="hsl(28 30% 40%)" strokeWidth="0.5" />
            <rect x="82" y="164" width="10" height="14" fill="none" stroke="white" strokeWidth="1" opacity="0.7" />
            <rect x="108" y="164" width="10" height="14" fill="none" stroke="white" strokeWidth="1" opacity="0.7" />
            <rect x="141" y="131" width="8" height="8" fill="white" transform="rotate(45 145 135)" />
            <rect x="96" y="92" width="8" height="8" fill="white" transform="rotate(45 100 96)" />
            <rect x="51" y="131" width="8" height="8" fill="white" transform="rotate(45 55 135)" />
            <circle cx="65" cy="175" r="6" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
            <circle cx="135" cy="175" r="6" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
            <rect x="8" y="165" width="22" height="30" rx="2" fill="hsl(120 30% 25%)" stroke="hsl(120 25% 20%)" strokeWidth="1" />
            <rect x="170" y="165" width="22" height="30" rx="2" fill="hsl(120 30% 25%)" stroke="hsl(120 25% 20%)" strokeWidth="1" />
            <rect x="6" y="162" width="26" height="5" rx="1" fill="hsl(120 20% 18%)" />
            <rect x="168" y="162" width="26" height="5" rx="1" fill="hsl(120 20% 18%)" />
            
            <g className="text-[8px] font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              <text x="100" y="45" textAnchor="middle" fill="white">CF</text>
              <text x="40" y="70" textAnchor="middle" fill="white">LF</text>
              <text x="160" y="70" textAnchor="middle" fill="white">RF</text>
              <text x="55" y="125" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">3B</text>
              <text x="145" y="125" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">1B</text>
              <text x="100" y="88" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">2B</text>
              <text x="70" y="108" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">SS</text>
              <text x="100" y="145" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">P</text>
            </g>
            
            <g transform="translate(100, 25)">
              <polygon points="0,-10 -6,2 0,-2 6,2" fill="hsl(var(--primary))" />
              <text y="14" textAnchor="middle" className="text-[9px] font-bold" fill="hsl(var(--primary))">
                {fieldDirection.toUpperCase()}
              </text>
            </g>
            
            {!isNight && (
              <g transform={`translate(${sunPosition.x * 2}, ${sunPosition.y * 2})`}>
                <circle r="18" fill="url(#sunGlow)" />
                <circle r="10" fill="hsl(45 100% 55%)" stroke="hsl(45 100% 70%)" strokeWidth="2" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <line key={angle} x1="0" y1="0" x2={Math.cos(angle * Math.PI / 180) * 16} y2={Math.sin(angle * Math.PI / 180) * 16} stroke="hsl(45 100% 60%)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                ))}
              </g>
            )}
          </svg>
        </div>
        
        {/* Sun Impact Analysis */}
        <div className="space-y-2">
          <h5 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Sun className="h-4 w-4 text-amber-500" />
            {t('weather.gameDayPrep.sunImpact')}
          </h5>
          <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
            {sunImpactPositions.map((position, idx) => (
              <p key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                {position}
              </p>
            ))}
          </div>
        </div>
        
        {/* Pre-Game Warmup Section */}
        {warmup && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <span className="text-lg">{warmup.icon}</span>
                {t('weather.gameDayPrep.preGameWarmup')}
              </h5>
              <Badge variant="outline" className={warmup.color}>
                {warmup.duration}
              </Badge>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              {warmup.exercises.map((exercise, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{exercise}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">{warmup.tip}</p>
            </div>
          </div>
        )}
        
        {/* Outfit & Gear Recommendations */}
        <div className="space-y-3">
          <h5 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            👕 {t('weather.gameDayPrep.outfitRecommendations')}
          </h5>
          
          <div className="grid gap-2">
            {/* Temperature */}
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600">
                <Thermometer className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  {t('weather.gameDayPrep.temperatureGear')} ({Math.round(activeTemperature ?? 0)}°F)
                </p>
                <p className="text-sm text-foreground">{tempGear.text}</p>
              </div>
            </div>
            
            {/* UV Protection */}
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  {t('weather.gameDayPrep.uvProtection')} {uvIndex !== undefined && `(UV ${uvIndex})`}
                </p>
                <p className="text-sm text-foreground">{uvProtection.text}</p>
              </div>
            </div>
            
            {/* Wind */}
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-100 text-sky-600">
                <Wind className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  {t('weather.gameDayPrep.windGear')} ({Math.round(activeWindSpeed ?? 0)} mph)
                </p>
                <p className="text-sm text-foreground">{windGear.text}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
