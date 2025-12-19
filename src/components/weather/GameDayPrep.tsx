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
              {/* Outfield grass gradient */}
              <linearGradient id="outfieldGrass" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(120 45% 35%)" />
                <stop offset="100%" stopColor="hsl(120 50% 28%)" />
              </linearGradient>
              
              {/* Infield grass gradient */}
              <linearGradient id="infieldGrass" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(120 50% 38%)" />
                <stop offset="100%" stopColor="hsl(120 45% 32%)" />
              </linearGradient>
              
              {/* Infield dirt gradient */}
              <linearGradient id="infieldDirt" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(28 55% 52%)" />
                <stop offset="100%" stopColor="hsl(28 50% 44%)" />
              </linearGradient>
              
              {/* Warning track gradient */}
              <linearGradient id="warningTrack" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(28 40% 48%)" />
                <stop offset="100%" stopColor="hsl(28 35% 40%)" />
              </linearGradient>
              
              {/* Grass mowing stripe pattern - alternating */}
              <pattern id="mowPattern" width="12" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
                <rect width="6" height="200" fill="hsl(120 48% 36%)" />
                <rect x="6" width="6" height="200" fill="hsl(120 45% 32%)" />
              </pattern>
              
              {/* Sun glow */}
              <radialGradient id="sunGlow">
                <stop offset="0%" stopColor="hsl(45 100% 70%)" stopOpacity="0.9" />
                <stop offset="50%" stopColor="hsl(45 100% 60%)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(45 100% 55%)" stopOpacity="0" />
              </radialGradient>
              
              {/* Clip path for outfield fan shape */}
              <clipPath id="outfieldClip">
                <path d="M 100 185 L 5 90 Q 5 5 100 5 Q 195 5 195 90 L 100 185 Z" />
              </clipPath>
              
              {/* Clip path for inner grass */}
              <clipPath id="innerGrassClip">
                <path d="M 100 180 L 15 85 Q 15 15 100 15 Q 185 15 185 85 L 100 180 Z" />
              </clipPath>
            </defs>
            
            {/* Background */}
            <rect width="200" height="200" fill="hsl(var(--muted))" rx="8" />
            
            {/* Outfield fence/wall */}
            <path
              d="M 100 188 L 2 88 Q 2 2 100 2 Q 198 2 198 88 L 100 188 Z"
              fill="hsl(150 25% 25%)"
              stroke="hsl(150 20% 20%)"
              strokeWidth="2"
            />
            
            {/* Warning track - brown dirt around outfield perimeter */}
            <path
              d="M 100 185 L 5 88 Q 5 5 100 5 Q 195 5 195 88 L 100 185 Z"
              fill="url(#warningTrack)"
            />
            
            {/* Outfield grass base */}
            <path
              d="M 100 178 L 15 85 Q 15 15 100 15 Q 185 15 185 85 L 100 178 Z"
              fill="url(#outfieldGrass)"
            />
            
            {/* Grass mowing stripes overlay */}
            <g clipPath="url(#innerGrassClip)">
              <rect x="0" y="0" width="200" height="200" fill="url(#mowPattern)" opacity="0.6" />
            </g>
            
            {/* Infield grass cutout (arc behind bases) */}
            <ellipse cx="100" cy="148" rx="52" ry="38" fill="url(#infieldGrass)" />
            
            {/* Infield dirt area */}
            <path
              d="M 100 182 
                 L 52 138 
                 Q 48 130 52 122
                 L 100 82
                 L 148 122
                 Q 152 130 148 138
                 L 100 182 Z"
              fill="url(#infieldDirt)"
            />
            
            {/* Home plate dirt circle extension */}
            <ellipse cx="100" cy="176" rx="18" ry="12" fill="url(#infieldDirt)" />
            
            {/* Pitcher's mound dirt circle */}
            <ellipse cx="100" cy="135" rx="12" ry="9" fill="hsl(28 45% 55%)" />
            
            {/* Foul lines extending to outfield */}
            <line x1="100" y1="178" x2="8" y2="86" stroke="white" strokeWidth="2" opacity="0.95" />
            <line x1="100" y1="178" x2="192" y2="86" stroke="white" strokeWidth="2" opacity="0.95" />
            
            {/* Base paths (white lines) */}
            <line x1="100" y1="174" x2="55" y2="135" stroke="white" strokeWidth="1.5" opacity="0.85" />
            <line x1="55" y1="135" x2="100" y2="96" stroke="white" strokeWidth="1.5" opacity="0.85" />
            <line x1="100" y1="96" x2="145" y2="135" stroke="white" strokeWidth="1.5" opacity="0.85" />
            <line x1="145" y1="135" x2="100" y2="174" stroke="white" strokeWidth="1.5" opacity="0.85" />
            
            {/* Pitcher's mound rubber */}
            <rect x="96" y="133" width="8" height="2" fill="white" rx="0.5" />
            
            {/* Home plate (pentagon) */}
            <polygon
              points="100,176 94,172 94,167 106,167 106,172"
              fill="white"
              stroke="hsl(28 30% 40%)"
              strokeWidth="0.5"
            />
            
            {/* Batter's boxes */}
            <rect x="82" y="164" width="10" height="14" fill="none" stroke="white" strokeWidth="1" opacity="0.7" />
            <rect x="108" y="164" width="10" height="14" fill="none" stroke="white" strokeWidth="1" opacity="0.7" />
            
            {/* First base */}
            <rect x="141" y="131" width="8" height="8" fill="white" transform="rotate(45 145 135)" />
            
            {/* Second base */}
            <rect x="96" y="92" width="8" height="8" fill="white" transform="rotate(45 100 96)" />
            
            {/* Third base */}
            <rect x="51" y="131" width="8" height="8" fill="white" transform="rotate(45 55 135)" />
            
            {/* On-deck circles */}
            <circle cx="65" cy="175" r="6" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
            <circle cx="135" cy="175" r="6" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
            
            {/* Dugouts */}
            <rect x="8" y="165" width="22" height="30" rx="2" fill="hsl(120 30% 25%)" stroke="hsl(120 25% 20%)" strokeWidth="1" />
            <rect x="170" y="165" width="22" height="30" rx="2" fill="hsl(120 30% 25%)" stroke="hsl(120 25% 20%)" strokeWidth="1" />
            {/* Dugout roofs */}
            <rect x="6" y="162" width="26" height="5" rx="1" fill="hsl(120 20% 18%)" />
            <rect x="168" y="162" width="26" height="5" rx="1" fill="hsl(120 20% 18%)" />
            
            {/* Position labels */}
            <g className="text-[8px] font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              <text x="100" y="45" textAnchor="middle" fill="white">CF</text>
              <text x="40" y="70" textAnchor="middle" fill="white">LF</text>
              <text x="160" y="70" textAnchor="middle" fill="white">RF</text>
              <text x="55" y="125" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">3B</text>
              <text x="145" y="125" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">1B</text>
              <text x="100" y="88" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">2B</text>
              <text x="72" y="152" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">SS</text>
              <text x="100" y="145" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="6">P</text>
            </g>
            
            {/* Direction indicator arrow */}
            <g transform="translate(100, 25)">
              <polygon points="0,-10 -6,2 0,-2 6,2" fill="hsl(var(--primary))" />
              <text y="14" textAnchor="middle" className="text-[9px] font-bold" fill="hsl(var(--primary))">
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
