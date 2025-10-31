import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Wind, Droplets, Eye, Thermometer, MapPin, Search, Icon } from "lucide-react";
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
}

interface WeatherWidgetProps {
  expanded?: boolean;
  sport?: 'baseball' | 'softball';
}

export function WeatherWidget({ expanded = false, sport = 'baseball' }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState("");
  const { toast } = useToast();

  const fetchWeather = async (searchLocation?: string) => {
    try {
      setLoading(true);
      let locationToFetch = searchLocation || location;
      
      // Try geolocation if no location is set
      if (!locationToFetch && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          locationToFetch = `${position.coords.latitude},${position.coords.longitude}`;
        } catch {
          locationToFetch = "New York";
        }
      } else if (!locationToFetch) {
        locationToFetch = "New York";
      }

      const { data, error } = await supabase.functions.invoke("get-weather", {
        body: { location: locationToFetch, sport },
      });

      if (error) throw error;

      setWeather(data);
      if (!searchLocation && locationToFetch !== location) {
        setLocation(locationToFetch);
      }
    } catch (error: any) {
      console.error("Error fetching weather:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch weather data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (location.trim()) {
      fetchWeather(location);
    }
  };

  useEffect(() => {
    // Auto-fetch on mount and when sport changes
    fetchWeather();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Weather Conditions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Icon 
                    iconNode={baseball} 
                    size={18}
                    className="text-primary"
                  />
                  {weather.sportAnalysis.sport} Conditions Analysis
                </h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium min-w-[110px]">Ball Flight:</span>
                    <span className="text-muted-foreground">{weather.sportAnalysis.ballFlight}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium min-w-[110px]">Wind Impact:</span>
                    <span className="text-muted-foreground">{weather.sportAnalysis.windImpact}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium min-w-[110px]">Field Conditions:</span>
                    <span className="text-muted-foreground">{weather.sportAnalysis.fieldCondition}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium min-w-[110px]">Tracking:</span>
                    <span className="text-muted-foreground">{weather.sportAnalysis.trackingCondition}</span>
                  </div>
                  {weather.sportAnalysis.uvWarning && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[110px]">UV Warning:</span>
                      <span className="text-amber-600 font-medium">{weather.sportAnalysis.uvWarning}</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t flex items-start gap-2">
                    <span className="font-semibold min-w-[110px]">Recommendation:</span>
                    <span className="font-semibold">{weather.sportAnalysis.recommendation}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
