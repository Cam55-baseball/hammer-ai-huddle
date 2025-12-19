import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Wind, Droplets, Eye, Thermometer, MapPin, Search, Icon, Calendar, TrendingUp, TrendingDown, CloudRain, Target, Circle, Sun, CloudSun, Snowflake, Zap, Sunrise, Sunset, Clock, Globe } from "lucide-react";
import { baseball } from "@lucide/lab";
import { Skeleton } from "@/components/ui/skeleton";
import { HourlyForecastSection } from "@/components/weather/HourlyForecastSection";
import { SunTimeline } from "@/components/weather/SunTimeline";
interface SportAnalysis {
  sport: string;
  ballFlight: string;
  windImpact: string;
  fieldCondition: string;
  trackingCondition: string;
  uvWarning: string;
  recommendation: string;
}

interface DailyForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  weatherCode: number;
  windSpeedMax: number;
  precipitationChance: number;
  recommendation: string;
  recommendationColor: 'green' | 'yellow' | 'red';
}

interface DrillRecommendation {
  category: string;
  drills: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

interface HourlyForecast {
  time: string;
  temperature: number;
  condition: string;
  weatherCode: number;
  windSpeed: number;
  precipitationChance: number;
  humidity: number;
}

interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  uvIndex: number;
  sunrise?: string;
  sunset?: string;
  timezone?: string;
  sportAnalysis?: SportAnalysis;
  dailyForecast?: DailyForecast[];
  hourlyForecast?: HourlyForecast[];
  drillRecommendations?: DrillRecommendation[];
}

interface WeatherWidgetProps {
  expanded?: boolean;
  sport?: 'baseball' | 'softball';
}

export function WeatherWidget({ expanded = false, sport = 'baseball' }: WeatherWidgetProps) {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const [showHourlyForecast, setShowHourlyForecast] = useState(false);
  const [showDrills, setShowDrills] = useState(false);
  const { toast } = useToast();

  const fetchWeather = async (searchLocation?: string, sportParam?: 'baseball' | 'softball') => {
    const sportToUse = sportParam || sport;
    console.log(`WeatherWidget: fetching weather with sport: ${sportToUse}`);
    try {
      setLoading(true);
      setError(null);
      let locationToFetch = searchLocation || location;
      
      if (!locationToFetch && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          locationToFetch = `${position.coords.latitude},${position.coords.longitude}`;
        } catch {
          locationToFetch = "New York";
        }
      } else if (!locationToFetch) {
        locationToFetch = "New York";
      }

      const { data, error } = await supabase.functions.invoke("get-weather", {
        body: { location: locationToFetch, sport: sportToUse },
      });

      if (error) throw error;

      if (!data) {
        throw new Error(t('weather.noDataReceived'));
      }

      setWeather(data);
      if (!searchLocation) {
        setLocation(data.location);
      }
    } catch (error: any) {
      console.error("Error fetching weather:", error);
      const errorMessage = error.message || t('weather.fetchError');
      setError(errorMessage);
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (location.trim()) {
      fetchWeather(location, sport);
    }
  };

  useEffect(() => {
    fetchWeather(undefined, sport);
  }, [sport]);

  // Dynamic weather gradient based on conditions
  const getWeatherGradient = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('clear') || c.includes('sunny')) 
      return 'from-amber-400 via-orange-500 to-yellow-500';
    if (c.includes('partly')) 
      return 'from-sky-400 via-blue-400 to-amber-300';
    if (c.includes('cloud') || c.includes('overcast')) 
      return 'from-slate-400 via-gray-500 to-slate-600';
    if (c.includes('rain') || c.includes('drizzle')) 
      return 'from-blue-500 via-blue-600 to-indigo-700';
    if (c.includes('storm') || c.includes('thunder')) 
      return 'from-slate-700 via-purple-800 to-slate-900';
    if (c.includes('snow') || c.includes('sleet')) 
      return 'from-slate-200 via-blue-100 to-white';
    if (c.includes('fog') || c.includes('mist')) 
      return 'from-gray-300 via-gray-400 to-gray-500';
    return 'from-sky-400 via-blue-500 to-indigo-600';
  };

  // Weather icon based on condition
  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('clear') || c.includes('sunny')) return <Sun className="h-16 w-16 sm:h-20 sm:w-20 text-white drop-shadow-lg" />;
    if (c.includes('partly')) return <CloudSun className="h-16 w-16 sm:h-20 sm:w-20 text-white drop-shadow-lg" />;
    if (c.includes('cloud') || c.includes('overcast')) return <Cloud className="h-16 w-16 sm:h-20 sm:w-20 text-white drop-shadow-lg" />;
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className="h-16 w-16 sm:h-20 sm:w-20 text-white drop-shadow-lg" />;
    if (c.includes('storm') || c.includes('thunder')) return <Zap className="h-16 w-16 sm:h-20 sm:w-20 text-white drop-shadow-lg" />;
    if (c.includes('snow') || c.includes('sleet')) return <Snowflake className="h-16 w-16 sm:h-20 sm:w-20 text-blue-800 drop-shadow-lg" />;
    return <Cloud className="h-16 w-16 sm:h-20 sm:w-20 text-white drop-shadow-lg" />;
  };

  if (loading && !weather) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Skeleton className="h-48 w-full rounded-t-lg" />
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrainingCondition = () => {
    if (!weather) return { text: t('weather.unknown'), color: "bg-muted text-muted-foreground", pulse: false };
    
    const { windSpeed, temperature } = weather;
    
    if (windSpeed > 20 || temperature < 40 || temperature > 95) {
      return { text: t('weather.poor'), color: "bg-red-500/90 text-white", pulse: false };
    } else if (windSpeed > 15 || temperature < 50 || temperature > 85) {
      return { text: t('weather.fair'), color: "bg-amber-500/90 text-white", pulse: false };
    }
    return { text: t('weather.excellent'), color: "bg-emerald-500/90 text-white", pulse: true };
  };

  const condition = getTrainingCondition();

  const formatForecastDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('weather.today');
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t('weather.tomorrow');
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const getRecommendationColorClass = (color: 'green' | 'yellow' | 'red') => {
    switch (color) {
      case 'green': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'yellow': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'red': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColorClass = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-primary text-primary-foreground';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatHourlyTime = (timeString: string, index: number) => {
    if (index === 0) return t('weather.now');
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  };

  const getHourlyWeatherIcon = (condition: string, size: string = 'h-5 w-5') => {
    const c = condition.toLowerCase();
    if (c.includes('clear') || c.includes('sunny')) return <Sun className={`${size} text-amber-500`} />;
    if (c.includes('partly')) return <CloudSun className={`${size} text-sky-500`} />;
    if (c.includes('cloud') || c.includes('overcast')) return <Cloud className={`${size} text-gray-500`} />;
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className={`${size} text-blue-500`} />;
    if (c.includes('storm') || c.includes('thunder')) return <Zap className={`${size} text-purple-500`} />;
    if (c.includes('snow') || c.includes('sleet')) return <Snowflake className={`${size} text-blue-400`} />;
    return <Cloud className={`${size} text-gray-500`} />;
  };

  const weatherGradient = weather ? getWeatherGradient(weather.condition) : 'from-sky-400 via-blue-500 to-indigo-600';

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      {/* Search Bar - Glass-morphism Style */}
      <div className="relative">
        <div className="flex gap-2 p-1 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('weather.searchLocation')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} className="rounded-lg">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && !weather && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-center space-y-3">
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Button onClick={() => fetchWeather()} variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {!weather && !loading && !error && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {t('weather.enterLocationPrompt')}
            </p>
          </CardContent>
        </Card>
      )}

      {weather && (
        <div className="space-y-4">
          {/* Main Weather Card - Premium Design */}
          <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${weatherGradient} p-5 sm:p-6 text-white shadow-xl`}>
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Location with Timezone */}
                  <div className="flex items-center gap-2 text-white/80 mb-1 flex-wrap">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">{weather.location}</span>
                    {weather.timezone && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-semibold">
                        <Globe className="h-3 w-3" />
                        <span>{weather.timezone}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Temperature - Large Display */}
                  <p className="text-6xl sm:text-7xl font-bold tracking-tight">
                    {Math.round(weather.temperature)}°
                  </p>
                  
                  {/* Feels Like Badge */}
                  <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-white/20 rounded-full backdrop-blur-sm">
                    <Thermometer className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('weather.feelsLike')} {Math.round(weather.feelsLike)}°F</span>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end">
                  {/* Weather Icon */}
                  <div className="mb-2">
                    {getWeatherIcon(weather.condition)}
                  </div>
                  
                  {/* Condition Text */}
                  <p className="text-lg sm:text-xl font-semibold mb-2">{weather.condition}</p>
                  
                  {/* Training Readiness Badge */}
                  <div className={`px-4 py-1.5 rounded-full font-bold text-sm ${condition.color} ${condition.pulse ? 'animate-pulse' : ''}`}>
                    {condition.text}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sunrise/Sunset Timeline */}
          {weather.sunrise && weather.sunset && (
            <SunTimeline sunrise={weather.sunrise} sunset={weather.sunset} />
          )}

          {/* Hourly Forecast Toggle - Moved above stats */}
          {weather?.hourlyForecast && weather.hourlyForecast.length > 0 && (
            <Button 
              variant="outline" 
              className="w-full group hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={() => setShowHourlyForecast(!showHourlyForecast)}
            >
              <Clock className="h-4 w-4 mr-2" />
              {showHourlyForecast ? t('weather.hideHourlyForecast') : t('weather.toggleHourlyForecast')}
            </Button>
          )}

          {/* Hourly Forecast Cards */}
          {showHourlyForecast && weather?.hourlyForecast && weather.hourlyForecast.length > 0 && (
            <HourlyForecastSection 
              hourlyForecast={weather.hourlyForecast} 
              sunrise={weather.sunrise}
              sunset={weather.sunset}
            />
          )}

          {/* Stats Grid - Enhanced Cards */}
          {expanded && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Wind Card */}
              <Card className="group hover:shadow-md transition-all duration-300 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sky-100 text-sky-600 group-hover:scale-110 transition-transform">
                      <Wind className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{t('weather.wind')}</p>
                      <p className="text-lg font-bold">{weather.windSpeed} mph</p>
                      <p className="text-xs text-muted-foreground">{weather.windDirection}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Humidity Card */}
              <Card className="group hover:shadow-md transition-all duration-300 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                      <Droplets className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{t('weather.humidity')}</p>
                      <p className="text-lg font-bold">{weather.humidity}%</p>
                      <p className="text-xs text-muted-foreground">{weather.humidity > 70 ? t('weather.high') : weather.humidity > 40 ? t('weather.moderate') : t('weather.low')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visibility Card */}
              <Card className="group hover:shadow-md transition-all duration-300 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
                      <Eye className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{t('weather.visibility')}</p>
                      <p className="text-lg font-bold">{weather.visibility} mi</p>
                      <p className="text-xs text-muted-foreground">{weather.visibility >= 10 ? t('weather.clear') : weather.visibility >= 5 ? t('weather.good') : t('weather.limited')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* UV Index Card */}
              <Card className="group hover:shadow-md transition-all duration-300 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl group-hover:scale-110 transition-transform ${
                      weather.uvIndex >= 8 ? 'bg-red-100 text-red-600' : 
                      weather.uvIndex >= 6 ? 'bg-orange-100 text-orange-600' : 
                      weather.uvIndex >= 3 ? 'bg-amber-100 text-amber-600' : 
                      'bg-green-100 text-green-600'
                    }`}>
                      <Sun className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{t('weather.uvIndex')}</p>
                      <p className="text-lg font-bold">{weather.uvIndex}</p>
                      <p className="text-xs text-muted-foreground">
                        {weather.uvIndex >= 8 ? t('weather.veryHigh') : weather.uvIndex >= 6 ? t('weather.high') : weather.uvIndex >= 3 ? t('weather.moderate') : t('weather.low')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sunrise Card */}
              {weather.sunrise && (
                <Card className="group hover:shadow-md transition-all duration-300 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform">
                        <Sunrise className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{t('weather.sunrise')}</p>
                        <p className="text-lg font-bold">{weather.sunrise}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sunset Card */}
              {weather.sunset && (
                <Card className="group hover:shadow-md transition-all duration-300 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
                        <Sunset className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{t('weather.sunset')}</p>
                        <p className="text-lg font-bold">{weather.sunset}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Sport Analysis - Premium Card */}
          {expanded && weather?.sportAnalysis && (
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className={`bg-gradient-to-r ${
                weather.sportAnalysis.sport.toLowerCase().includes('softball') 
                  ? 'from-pink-500 to-rose-600' 
                  : 'from-primary to-red-600'
              } p-4 text-white`}>
                <h4 className="font-bold text-lg flex items-center gap-2">
                  {weather.sportAnalysis.sport.toLowerCase().includes('softball') ? (
                    <Circle size={20} className="fill-white/30" />
                  ) : (
                    <Icon iconNode={baseball} size={20} />
                  )}
                  {t('weather.sportAnalysis', { sport: weather.sportAnalysis.sport })}
                </h4>
              </div>
              <CardContent className="p-3 sm:p-5 space-y-3 bg-gradient-to-b from-card to-muted/20 overflow-hidden">
                <div className="grid gap-3 max-w-full">
                  {[
                    { label: t('weather.ballFlight'), value: weather.sportAnalysis.ballFlight },
                    { label: t('weather.windImpact'), value: weather.sportAnalysis.windImpact },
                    { label: t('weather.fieldConditions'), value: weather.sportAnalysis.fieldCondition },
                    { label: t('weather.tracking'), value: weather.sportAnalysis.trackingCondition },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors max-w-full">
                      <span className="font-semibold text-sm min-w-[100px] sm:min-w-[120px] text-foreground flex-shrink-0">{item.label}:</span>
                      <span className="text-sm text-muted-foreground break-words overflow-hidden">{item.value}</span>
                    </div>
                  ))}
                  
                  {weather.sportAnalysis.uvWarning && (
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 p-2 rounded-lg bg-amber-50 border border-amber-200 max-w-full">
                      <span className="font-semibold text-sm min-w-[100px] sm:min-w-[120px] text-amber-800 flex-shrink-0">⚠️ {t('weather.uvWarning')}:</span>
                      <span className="text-sm text-amber-700 break-words overflow-hidden">{weather.sportAnalysis.uvWarning}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-3 mt-3 border-t">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <span className="font-bold text-sm text-primary block mb-1">💡 {t('weather.recommendation')}</span>
                    <span className="text-sm text-foreground">{weather.sportAnalysis.recommendation}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drill Recommendations Toggle */}
          {weather?.drillRecommendations && weather.drillRecommendations.length > 0 && (
            <Button 
              variant="outline" 
              className="w-full group hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={() => setShowDrills(!showDrills)}
            >
              <Target className="h-4 w-4 mr-2 group-hover:animate-pulse" />
              {showDrills ? t('weather.hideDrills') : t('weather.toggleDrills')}
            </Button>
          )}

          {/* Drill Recommendations List */}
          {showDrills && weather?.drillRecommendations && weather.drillRecommendations.length > 0 && (
            <div className="space-y-3 animate-in fade-in-50 slide-in-from-top-2 duration-300">
              <h4 className="font-bold text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                {t('weather.drillRecommendationsTitle')}
              </h4>
              
              <div className="grid gap-3">
                {weather.drillRecommendations.map((rec, index) => (
                  <Card key={index} className="overflow-hidden hover:shadow-md transition-all border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{rec.icon}</span>
                          <h5 className="font-bold">{rec.category}</h5>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${getPriorityColorClass(rec.priority)}`}>
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 italic border-l-2 border-primary/30 pl-3">
                        {rec.reason}
                      </p>
                      
                      <div className="space-y-2">
                        {rec.drills.map((drill, drillIndex) => (
                          <div key={drillIndex} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <span className="text-primary font-bold">•</span>
                            <span>{drill}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-2xl">💡</span>
                  <p className="text-sm text-muted-foreground">
                    <strong>{t('weather.proTip')}</strong> {t('weather.prioritizeDrills')}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}


          {/* 7-Day Forecast Toggle */}
          {weather?.dailyForecast && weather.dailyForecast.length > 0 && (
            <Button 
              variant="outline" 
              className="w-full group hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={() => setShowForecast(!showForecast)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {showForecast ? t('weather.hideForecast') : t('weather.toggleForecast')}
            </Button>
          )}

          {/* 7-Day Forecast Cards */}
          {showForecast && weather?.dailyForecast && weather.dailyForecast.length > 0 && (
            <div className="space-y-3 animate-in fade-in-50 slide-in-from-top-2 duration-300">
              <h4 className="font-bold text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t('weather.forecastTitle')}
              </h4>
              
              <div className="grid gap-3">
                {weather.dailyForecast.map((day) => (
                  <Card key={day.date} className="overflow-hidden hover:shadow-md transition-all border-border/50">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[70px]">
                            <p className="font-bold text-sm">{formatForecastDate(day.date)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center text-red-500">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                <span className="font-bold">{Math.round(day.high)}°</span>
                              </div>
                              <div className="flex items-center text-blue-500">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                <span className="font-medium">{Math.round(day.low)}°</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm text-muted-foreground">{day.condition}</span>
                          {day.precipitationChance > 0 && (
                            <span className="text-xs text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
                              <CloudRain className="h-3 w-3" />
                              {day.precipitationChance}%
                            </span>
                          )}
                          <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${getRecommendationColorClass(day.recommendationColor)}`}>
                            {day.recommendation}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
