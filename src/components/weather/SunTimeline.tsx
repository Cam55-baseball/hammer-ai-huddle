import { Sunrise, Sunset } from "lucide-react";

interface SunTimelineProps {
  sunrise: string;
  sunset: string;
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

export function SunTimeline({ sunrise, sunset }: SunTimelineProps) {
  // Calculate current position in the day
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sunriseMinutes = parseTimeToMinutes(sunrise);
  const sunsetMinutes = parseTimeToMinutes(sunset);
  
  // Calculate percentage through daylight hours
  const daylightDuration = sunsetMinutes - sunriseMinutes;
  let currentPercentage = 0;
  
  if (currentMinutes < sunriseMinutes) {
    // Before sunrise - position at start
    currentPercentage = 0;
  } else if (currentMinutes > sunsetMinutes) {
    // After sunset - position at end
    currentPercentage = 100;
  } else {
    // During daylight - calculate percentage
    currentPercentage = ((currentMinutes - sunriseMinutes) / daylightDuration) * 100;
  }
  
  // Check if it's currently night
  const isNight = currentMinutes < sunriseMinutes || currentMinutes > sunsetMinutes;
  
  // Golden hour detection (30 min after sunrise, 30 min before sunset)
  const isGoldenMorning = currentMinutes >= sunriseMinutes && currentMinutes <= sunriseMinutes + 30;
  const isGoldenEvening = currentMinutes >= sunsetMinutes - 30 && currentMinutes <= sunsetMinutes;
  const isGoldenHour = isGoldenMorning || isGoldenEvening;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-800 via-30% via-orange-500 via-50% via-amber-400 via-70% to-indigo-900 p-4 shadow-lg">
      {/* Stars decoration for night portions */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-2 left-[5%] w-1 h-1 bg-white/60 rounded-full animate-twinkle" />
        <div className="absolute top-4 left-[10%] w-0.5 h-0.5 bg-white/40 rounded-full animate-twinkle" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-3 left-[15%] w-0.5 h-0.5 bg-white/50 rounded-full animate-twinkle" style={{ animationDelay: '1s' }} />
        <div className="absolute top-2 right-[5%] w-1 h-1 bg-white/60 rounded-full animate-twinkle" style={{ animationDelay: '0.3s' }} />
        <div className="absolute top-5 right-[10%] w-0.5 h-0.5 bg-white/40 rounded-full animate-twinkle" style={{ animationDelay: '0.8s' }} />
        <div className="absolute top-3 right-[15%] w-0.5 h-0.5 bg-white/50 rounded-full animate-twinkle" style={{ animationDelay: '1.3s' }} />
      </div>
      
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes sunGlow {
          0%, 100% { box-shadow: 0 0 20px 8px rgba(251, 191, 36, 0.6); }
          50% { box-shadow: 0 0 30px 12px rgba(251, 191, 36, 0.8); }
        }
        @keyframes sunPulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.1); }
        }
        .animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
        .animate-sun-glow { animation: sunGlow 3s ease-in-out infinite; }
        .animate-sun-pulse { animation: sunPulse 2s ease-in-out infinite; }
      `}</style>
      
      {/* Header with times */}
      <div className="relative z-10 flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 text-amber-200">
          <div className="p-1.5 bg-amber-500/30 rounded-lg backdrop-blur-sm">
            <Sunrise className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">{sunrise}</span>
        </div>
        
        <div className="text-center">
          <span className={`text-xs font-bold uppercase tracking-wider ${isGoldenHour ? 'text-amber-300' : isNight ? 'text-indigo-200' : 'text-white'}`}>
            {isGoldenHour ? '✨ Golden Hour' : isNight ? '🌙 Night' : '☀️ Daylight'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-orange-200">
          <span className="text-sm font-semibold">{sunset}</span>
          <div className="p-1.5 bg-orange-500/30 rounded-lg backdrop-blur-sm">
            <Sunset className="h-4 w-4" />
          </div>
        </div>
      </div>
      
      {/* Timeline track */}
      <div className="relative h-8">
        {/* Background track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 rounded-full bg-gradient-to-r from-indigo-800 via-amber-400 to-indigo-800 shadow-inner">
          {/* Daylight fill portion */}
          <div 
            className="absolute top-0 left-[15%] right-[15%] h-full rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-300"
            style={{ opacity: 0.9 }}
          />
        </div>
        
        {/* Sunrise marker */}
        <div className="absolute top-1/2 -translate-y-1/2 left-[15%] -translate-x-1/2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 border-2 border-white shadow-lg" />
        </div>
        
        {/* Sunset marker */}
        <div className="absolute top-1/2 -translate-y-1/2 right-[15%] translate-x-1/2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-red-500 border-2 border-white shadow-lg" />
        </div>
        
        {/* Current position indicator (sun/moon) */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 animate-sun-pulse z-10"
          style={{ 
            left: `${15 + (currentPercentage * 0.7)}%` // Map 0-100% to 15-85% of track
          }}
        >
          <div className={`relative w-6 h-6 rounded-full ${isNight ? 'bg-gradient-to-br from-slate-200 to-slate-400' : 'bg-gradient-to-br from-yellow-300 to-amber-500'} border-2 border-white shadow-xl ${!isNight ? 'animate-sun-glow' : ''}`}>
            {/* Sun rays or moon glow */}
            {!isNight && (
              <div className="absolute inset-0 rounded-full bg-amber-400/50 blur-md -z-10" />
            )}
            {isNight && (
              <>
                <div className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-slate-300/50" />
                <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-slate-300/30" />
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Current time label */}
      <div className="relative z-10 mt-2 text-center">
        <span className="text-xs text-white/70">
          Current: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </span>
      </div>
    </div>
  );
}
