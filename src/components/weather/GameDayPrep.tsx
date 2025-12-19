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
        <div className="relative aspect-square max-w-[300px] mx-auto">
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
            {/* Definitions */}
            <defs>
              {/* Grass gradient */}
              <linearGradient id="grassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(142 60% 35%)" />
                <stop offset="100%" stopColor="hsl(142 55% 28%)" />
              </linearGradient>
              
              {/* Outfield grass gradient */}
              <linearGradient id="outfieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(142 65% 38%)" />
                <stop offset="100%" stopColor="hsl(142 60% 32%)" />
              </linearGradient>
              
              {/* Infield dirt gradient */}
              <linearGradient id="dirtGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(30 45% 50%)" />
                <stop offset="100%" stopColor="hsl(30 40% 42%)" />
              </linearGradient>
              
              {/* Warning track */}
              <linearGradient id="warningTrackGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(30 35% 45%)" />
                <stop offset="100%" stopColor="hsl(30 30% 38%)" />
              </linearGradient>
              
              {/* Sun glow */}
              <radialGradient id="sunGlow">
                <stop offset="0%" stopColor="hsl(45 100% 70%)" stopOpacity="0.9" />
                <stop offset="50%" stopColor="hsl(45 100% 60%)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(45 100% 55%)" stopOpacity="0" />
              </radialGradient>
              
              {/* Grass mow pattern */}
              <pattern id="grassPattern" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="4" height="8" fill="hsl(142 58% 34%)" opacity="0.3" />
              </pattern>
            </defs>
            
            {/* Background - sky/stadium */}
            <rect width="200" height="200" fill="hsl(var(--muted))" rx="8" />
            
            {/* Warning track arc */}
            <path
              d="M 20 180 Q 20 20 180 180"
              fill="url(#warningTrackGradient)"
            />
            
            {/* Outfield grass */}
            <path
              d="M 30 175 Q 30 35 170 175"
              fill="url(#outfieldGradient)"
            />
            
            {/* Grass mow pattern overlay */}
            <path
              d="M 30 175 Q 30 35 170 175"
              fill="url(#grassPattern)"
              opacity="0.4"
            />
            
            {/* Infield grass (arc behind bases) */}
            <ellipse cx="100" cy="150" rx="55" ry="40" fill="url(#grassGradient)" />
            
            {/* Infield dirt diamond */}
            <polygon
              points="100,180 55,135 100,90 145,135"
              fill="url(#dirtGradient)"
            />
            
            {/* Base paths (white lines) */}
            <line x1="100" y1="175" x2="60" y2="135" stroke="white" strokeWidth="1.5" opacity="0.9" />
            <line x1="60" y1="135" x2="100" y2="95" stroke="white" strokeWidth="1.5" opacity="0.9" />
            <line x1="100" y1="95" x2="140" y2="135" stroke="white" strokeWidth="1.5" opacity="0.9" />
            <line x1="140" y1="135" x2="100" y2="175" stroke="white" strokeWidth="1.5" opacity="0.9" />
            
            {/* Foul lines extending to outfield */}
            <line x1="100" y1="175" x2="25" y2="100" stroke="white" strokeWidth="1.5" opacity="0.8" />
            <line x1="100" y1="175" x2="175" y2="100" stroke="white" strokeWidth="1.5" opacity="0.8" />
            
            {/* Pitcher's mound */}
            <ellipse cx="100" cy="140" rx="8" ry="6" fill="hsl(30 35% 55%)" />
            <rect x="97" y="138" width="6" height="2" fill="white" rx="0.5" />
            
            {/* Batter's boxes */}
            <rect x="85" y="168" width="8" height="12" fill="none" stroke="white" strokeWidth="1" opacity="0.7" />
            <rect x="107" y="168" width="8" height="12" fill="none" stroke="white" strokeWidth="1" opacity="0.7" />
            
            {/* Catcher's box */}
            <rect x="92" y="180" width="16" height="8" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
            
            {/* Home plate (pentagon) */}
            <polygon
              points="100,177 95,173 95,169 105,169 105,173"
              fill="white"
              stroke="hsl(30 30% 40%)"
              strokeWidth="0.5"
            />
            
            {/* First base */}
            <rect x="136" y="131" width="8" height="8" fill="white" transform="rotate(45 140 135)" />
            
            {/* Second base */}
            <rect x="96" y="91" width="8" height="8" fill="white" transform="rotate(45 100 95)" />
            
            {/* Third base */}
            <rect x="56" y="131" width="8" height="8" fill="white" transform="rotate(45 60 135)" />
            
            {/* On-deck circles */}
            <circle cx="70" cy="175" r="5" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
            <circle cx="130" cy="175" r="5" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
            
            {/* Position labels with background */}
            <g className="text-[8px] font-bold">
              <text x="100" y="55" textAnchor="middle" fill="white" className="drop-shadow-sm">CF</text>
              <text x="45" y="90" textAnchor="middle" fill="white" className="drop-shadow-sm">LF</text>
              <text x="155" y="90" textAnchor="middle" fill="white" className="drop-shadow-sm">RF</text>
              <text x="60" y="125" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">3B</text>
              <text x="140" y="125" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">1B</text>
              <text x="100" y="85" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">2B</text>
              <text x="73" y="155" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">SS</text>
              <text x="100" y="150" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">P</text>
            </g>
            
            {/* Direction indicator arrow */}
            <g transform="translate(100, 25)">
              <polygon points="0,-8 -5,2 0,0 5,2" fill="hsl(var(--primary))" />
              <text y="12" textAnchor="middle" className="text-[9px] font-bold" fill="hsl(var(--primary))">
                {fieldDirection.toUpperCase()}
              </text>
            </g>
            
            {/* Sun position indicator */}
            {!isNight && (
              <g transform={`translate(${sunPosition.x * 2}, ${sunPosition.y * 2})`}>
                {/* Outer glow */}
                <circle r="18" fill="url(#sunGlow)" className="animate-pulse" />
                {/* Sun body */}
                <circle r="10" fill="hsl(45 100% 55%)" />
                <circle r="7" fill="hsl(45 100% 65%)" />
                {/* Sun rays */}
                <g>
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                    <line
                      key={angle}
                      x1="0"
                      y1="-12"
                      x2="0"
                      y2="-16"
                      stroke="hsl(45 100% 60%)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      transform={`rotate(${angle})`}
                    />
                  ))}
                </g>
              </g>
            )}
            
            {/* Moon for night */}
            {isNight && (
              <g transform={`translate(${sunPosition.x * 2}, ${sunPosition.y * 2})`}>
                <circle r="12" fill="hsl(220 20% 85%)" />
                <circle r="12" cx="4" cy="-4" fill="hsl(var(--muted))" />
              </g>
            )}
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
