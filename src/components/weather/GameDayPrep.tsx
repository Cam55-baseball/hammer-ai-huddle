import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Compass } from "lucide-react";

interface GameDayPrepProps {
  sunrise: string;
  sunset: string;
  sport?: 'baseball' | 'softball';
}

type FieldDirection = 'north' | 'south' | 'east' | 'west';

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
    // Night time - sun is below horizon
    return currentMinutes < sunriseMinutes ? 90 : 270;
  }
  
  // Sun moves from ~90° (east) at sunrise to ~180° (south) at noon to ~270° (west) at sunset
  const progress = timeSinceSunrise / dayLength;
  return 90 + (progress * 180);
};

// Get relative sun position based on field direction and sun azimuth
const getRelativeSunPosition = (sunAzimuth: number, fieldDirection: FieldDirection): { x: number; y: number; label: string } => {
  // Field direction angle (where batter faces)
  const fieldAngles: Record<FieldDirection, number> = {
    north: 0,
    east: 90,
    south: 180,
    west: 270
  };
  
  const fieldAngle = fieldAngles[fieldDirection];
  // Calculate sun's position relative to field orientation
  const relativeAngle = sunAzimuth - fieldAngle;
  const normalizedAngle = ((relativeAngle % 360) + 360) % 360;
  
  // Convert angle to x,y position (center is 50,50, radius is 40)
  const radians = (normalizedAngle - 90) * (Math.PI / 180);
  const x = 50 + Math.cos(radians) * 38;
  const y = 50 + Math.sin(radians) * 38;
  
  // Determine label based on position
  let label = '';
  if (normalizedAngle >= 315 || normalizedAngle < 45) label = 'behind home plate';
  else if (normalizedAngle >= 45 && normalizedAngle < 135) label = 'right field side';
  else if (normalizedAngle >= 135 && normalizedAngle < 225) label = 'center field';
  else label = 'left field side';
  
  return { x, y, label };
};

// Generate sun impact bullets based on sun position
const getSunImpactBullets = (sunPosition: { label: string }, sunAzimuth: number, sunriseMinutes: number, sunsetMinutes: number, currentMinutes: number, t: any): string[] => {
  const bullets: string[] = [];
  const isNight = currentMinutes < sunriseMinutes || currentMinutes > sunsetMinutes;
  
  if (isNight) {
    bullets.push(t('weather.gameDayPrep.noSunImpact'));
    return bullets;
  }
  
  // Check if it's near sunrise or sunset (within 1 hour)
  const nearSunrise = currentMinutes >= sunriseMinutes && currentMinutes <= sunriseMinutes + 60;
  const nearSunset = currentMinutes >= sunsetMinutes - 60 && currentMinutes <= sunsetMinutes;
  
  if (nearSunrise || nearSunset) {
    bullets.push(t('weather.gameDayPrep.lowSunAngle'));
  }
  
  // Position-specific impacts
  if (sunPosition.label === 'behind home plate') {
    bullets.push(t('weather.gameDayPrep.sunBehindHome'));
    bullets.push(t('weather.gameDayPrep.pitcherGlare'));
  } else if (sunPosition.label === 'center field') {
    bullets.push(t('weather.gameDayPrep.sunInBatterEyes'));
    bullets.push(t('weather.gameDayPrep.outfieldersShielded'));
  } else if (sunPosition.label === 'left field side') {
    bullets.push(t('weather.gameDayPrep.leftFieldSun'));
    bullets.push(t('weather.gameDayPrep.shortstopCaution'));
  } else if (sunPosition.label === 'right field side') {
    bullets.push(t('weather.gameDayPrep.rightFieldSun'));
    bullets.push(t('weather.gameDayPrep.secondBaseCaution'));
  }
  
  // General recommendation
  bullets.push(t('weather.gameDayPrep.eyeBlackRecommend'));
  
  return bullets;
};

export function GameDayPrep({ sunrise, sunset, sport = 'baseball' }: GameDayPrepProps) {
  const { t } = useTranslation();
  const [fieldDirection, setFieldDirection] = useState<FieldDirection>('north');
  
  const currentTime = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);
  
  const sunriseMinutes = parseTimeToMinutes(sunrise);
  const sunsetMinutes = parseTimeToMinutes(sunset);
  const sunAzimuth = getSunAzimuth(currentTime, sunriseMinutes, sunsetMinutes);
  const sunPosition = getRelativeSunPosition(sunAzimuth, fieldDirection);
  const impactBullets = getSunImpactBullets(sunPosition, sunAzimuth, sunriseMinutes, sunsetMinutes, currentTime, t);
  
  const isNight = currentTime < sunriseMinutes || currentTime > sunsetMinutes;

  return (
    <Card className="overflow-hidden border-0 shadow-lg animate-in fade-in-50 slide-in-from-top-2 duration-300">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white">
        <h4 className="font-bold text-lg flex items-center gap-2">
          <Compass className="h-5 w-5" />
          {t('weather.gameDayPrep.title')}
        </h4>
      </div>
      
      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Field Direction Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {t('weather.gameDayPrep.fieldDirection')}
          </label>
          <Select value={fieldDirection} onValueChange={(v) => setFieldDirection(v as FieldDirection)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="north">{t('weather.gameDayPrep.north')}</SelectItem>
              <SelectItem value="south">{t('weather.gameDayPrep.south')}</SelectItem>
              <SelectItem value="east">{t('weather.gameDayPrep.east')}</SelectItem>
              <SelectItem value="west">{t('weather.gameDayPrep.west')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Baseball Field Graphic with Sun Position */}
        <div className="relative aspect-square max-w-[280px] mx-auto">
          {/* Field Background */}
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Grass background */}
            <circle cx="50" cy="50" r="48" fill="hsl(var(--muted))" />
            
            {/* Outfield grass (darker) */}
            <path
              d="M 50 50 L 10 50 A 40 40 0 0 1 90 50 Z"
              fill="hsl(142 76% 30%)"
              transform="rotate(-45 50 50)"
            />
            
            {/* Infield dirt */}
            <polygon
              points="50,75 30,55 50,35 70,55"
              fill="hsl(30 50% 45%)"
            />
            
            {/* Bases */}
            <rect x="48" y="33" width="4" height="4" fill="white" transform="rotate(45 50 35)" /> {/* 2nd */}
            <rect x="28" y="53" width="4" height="4" fill="white" transform="rotate(45 30 55)" /> {/* 3rd */}
            <rect x="68" y="53" width="4" height="4" fill="white" transform="rotate(45 70 55)" /> {/* 1st */}
            <polygon points="48,73 52,73 52,77 48,77" fill="white" /> {/* Home */}
            
            {/* Pitcher's mound */}
            <circle cx="50" cy="55" r="3" fill="hsl(30 40% 55%)" />
            
            {/* Position labels */}
            <text x="50" y="25" textAnchor="middle" className="text-[5px] fill-foreground font-bold">CF</text>
            <text x="25" y="40" textAnchor="middle" className="text-[5px] fill-foreground font-bold">LF</text>
            <text x="75" y="40" textAnchor="middle" className="text-[5px] fill-foreground font-bold">RF</text>
            <text x="50" y="82" textAnchor="middle" className="text-[5px] fill-foreground font-bold">HP</text>
            
            {/* Direction indicator */}
            <text x="50" y="10" textAnchor="middle" className="text-[6px] fill-primary font-bold">
              {fieldDirection.toUpperCase()}
            </text>
            
            {/* Sun position indicator */}
            {!isNight && (
              <g transform={`translate(${sunPosition.x}, ${sunPosition.y})`}>
                {/* Sun glow */}
                <circle r="8" fill="url(#sunGlow)" className="animate-pulse" />
                {/* Sun core */}
                <circle r="5" fill="hsl(45 100% 55%)" />
                {/* Sun rays */}
                <g className="origin-center">
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <line
                      key={angle}
                      x1="0"
                      y1="-6"
                      x2="0"
                      y2="-8"
                      stroke="hsl(45 100% 55%)"
                      strokeWidth="1"
                      transform={`rotate(${angle})`}
                    />
                  ))}
                </g>
              </g>
            )}
            
            {/* Moon for night */}
            {isNight && (
              <g transform={`translate(${sunPosition.x}, ${sunPosition.y})`}>
                <circle r="5" fill="hsl(220 20% 80%)" />
                <circle r="5" cx="2" cy="-2" fill="hsl(var(--muted))" />
              </g>
            )}
            
            {/* Gradient definition for sun glow */}
            <defs>
              <radialGradient id="sunGlow">
                <stop offset="0%" stopColor="hsl(45 100% 70%)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="hsl(45 100% 55%)" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
          
          {/* Sun position label */}
          <div className="absolute bottom-0 left-0 right-0 text-center">
            <span className="text-xs font-medium text-muted-foreground bg-background/80 px-2 py-1 rounded-full">
              <Sun className="inline h-3 w-3 mr-1 text-amber-500" />
              {isNight ? t('weather.gameDayPrep.sunBelowHorizon') : t(`weather.gameDayPrep.sunIn${sunPosition.label.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`)}
            </span>
          </div>
        </div>
        
        {/* Sun Impact Analysis */}
        <div className="space-y-3">
          <h5 className="font-bold text-sm flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            {t('weather.gameDayPrep.sunImpactAnalysis')}
          </h5>
          
          <ul className="space-y-2">
            {impactBullets.map((bullet, index) => (
              <li 
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground p-2 rounded-lg bg-muted/50"
              >
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
