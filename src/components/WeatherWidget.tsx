import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Wind, Droplets, Eye, Thermometer, MapPin, Search, Icon, Calendar, TrendingUp, TrendingDown, CloudRain } from "lucide-react";
import { baseball } from "@lucide/lab";
import { Skeleton } from "@/components/ui/skeleton";

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
  sportAnalysis?: SportAnalysis;
  dailyForecast?: DailyForecast[];
}

interface WeatherWidgetProps {
  expanded?: boolean;
  sport?: 'baseball' | 'softball';
}

export function WeatherWidget({ expanded = false, sport = 'baseball' }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const { toast } = useToast();

  const fetchWeather = async (searchLocation?: string, sportParam?: 'baseball' | 'softball') => {
    const sportToUse = sportParam || sport;
    try {
      setLoading(true);
      setError(null);
      let locationToFetch = searchLocation || location;
      
      // Try geolocation if no location is set
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
        throw new Error("No weather data received");
      }

      setWeather(data);
      // Update location input with the resolved location name from backend
      // This replaces coordinates with readable names like "New York, US"
      if (!searchLocation) {
        setLocation(data.location);
      }
    } catch (error: any) {
      console.error("Error fetching weather:", error);
      const errorMessage = error.message || "Failed to fetch weather data";
      setError(errorMessage);
      toast({
        title: "Error",
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
    // Auto-fetch on mount and when sport changes
    fetchWeather(undefined, sport);
  }, [sport]);

  if (loading && !weather) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getTrainingCondition = () => {
    if (!weather) return { text: "Unknown", color: "text-muted-foreground" };
    
    const { windSpeed, temperature } = weather;
    
    if (windSpeed > 20 || temperature < 40 || temperature > 95) {
      return { text: "Poor Conditions", color: "text-destructive" };
    } else if (windSpeed > 15 || temperature < 50 || temperature > 85) {
      return { text: "Fair Conditions", color: "text-yellow-500" };
    }
    return { text: "Excellent Conditions", color: "text-green-500" };
  };

  const condition = getTrainingCondition();

  const formatForecastDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const getRecommendationColorClass = (color: 'green' | 'yellow' | 'red') => {
    switch (color) {
      case 'green': return 'text-green-600 bg-green-50 border-green-200';
      case 'yellow': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'red': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Weather Conditions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-hidden max-w-full">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Enter location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {error && !weather && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center space-y-3">
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Button onClick={() => fetchWeather()} variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {!weather && !loading && !error && (
          <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Enter a location above to view weather conditions
            </p>
          </div>
        )}

        {weather && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{weather.location}</p>
                  <p className="text-3xl font-bold">{Math.round(weather.temperature)}°F</p>
                  <p className="text-sm text-muted-foreground">
                    Feels like {Math.round(weather.feelsLike)}°F
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-medium">{weather.condition}</p>
                  <p className={`text-sm font-semibold ${condition.color}`}>
                    {condition.text}
                  </p>
                </div>
              </div>
            </div>

            {expanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Wind className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Wind</p>
                    <p className="font-semibold">
                      {weather.windSpeed} mph {weather.windDirection}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Droplets className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Humidity</p>
                    <p className="font-semibold">{weather.humidity}%</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Visibility</p>
                    <p className="font-semibold">{weather.visibility} mi</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Thermometer className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">UV Index</p>
                    <p className="font-semibold">{weather.uvIndex}</p>
                  </div>
                </div>
              </div>
            )}

            {expanded && weather?.sportAnalysis && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4 space-y-2 sm:space-y-3 overflow-x-hidden max-w-full">
                <h4 className="font-semibold flex items-center gap-2">
                  <Icon 
                    iconNode={baseball} 
                    size={18}
                    className="text-primary"
                  />
                  {weather.sportAnalysis.sport} Conditions Analysis
                </h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex flex-col xs:flex-row xs:items-start gap-1 xs:gap-2">
                    <span className="font-medium text-sm sm:text-base">Ball Flight:</span>
                    <span className="text-muted-foreground text-sm sm:text-base break-words">{weather.sportAnalysis.ballFlight}</span>
                  </div>
                  <div className="flex flex-col xs:flex-row xs:items-start gap-1 xs:gap-2">
                    <span className="font-medium text-sm sm:text-base">Wind Impact:</span>
                    <span className="text-muted-foreground text-sm sm:text-base break-words">{weather.sportAnalysis.windImpact}</span>
                  </div>
                  <div className="flex flex-col xs:flex-row xs:items-start gap-1 xs:gap-2">
                    <span className="font-medium text-sm sm:text-base">Field Conditions:</span>
                    <span className="text-muted-foreground text-sm sm:text-base break-words">{weather.sportAnalysis.fieldCondition}</span>
                  </div>
                  <div className="flex flex-col xs:flex-row xs:items-start gap-1 xs:gap-2">
                    <span className="font-medium text-sm sm:text-base">Tracking:</span>
                    <span className="text-muted-foreground text-sm sm:text-base break-words">{weather.sportAnalysis.trackingCondition}</span>
                  </div>
                  {weather.sportAnalysis.uvWarning && (
                    <div className="flex flex-col xs:flex-row xs:items-start gap-1 xs:gap-2">
                      <span className="font-medium text-sm sm:text-base">UV Warning:</span>
                      <span className="text-amber-600 font-medium text-sm sm:text-base break-words">{weather.sportAnalysis.uvWarning}</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t flex flex-col xs:flex-row xs:items-start gap-1 xs:gap-2">
                    <span className="font-semibold text-sm sm:text-base">Recommendation:</span>
                    <span className="font-semibold text-sm sm:text-base break-words">{weather.sportAnalysis.recommendation}</span>
                  </div>
                </div>
              </div>
            )}

            {weather?.dailyForecast && weather.dailyForecast.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowForecast(!showForecast)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {showForecast ? 'Hide' : 'Show'} 7-Day Forecast
              </Button>
            )}

            {showForecast && weather?.dailyForecast && weather.dailyForecast.length > 0 && (
              <div className="space-y-3 animate-in fade-in-50 duration-300">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  7-Day Training Forecast
                </h4>
                
                <div className="grid gap-3">
                  {weather.dailyForecast.map((day) => (
                    <div 
                      key={day.date} 
                      className="rounded-lg border border-border bg-card p-3 sm:p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm sm:text-base">
                            {formatForecastDate(day.date)}
                          </p>
                          <p className="text-xs text-muted-foreground">{day.condition}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                            <span className="font-bold text-base sm:text-lg">{day.high}°</span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">{day.low}°</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Wind className="h-3 w-3" />
                          <span>{day.windSpeedMax} mph max</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CloudRain className="h-3 w-3" />
                          <span>{day.precipitationChance}% rain</span>
                        </div>
                      </div>
                      
                      <div className={`rounded-md border p-2 text-xs sm:text-sm font-medium ${getRecommendationColorClass(day.recommendationColor)}`}>
                        {day.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
