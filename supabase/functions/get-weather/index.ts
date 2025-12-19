import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeatherMetrics {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  uvIndex: number;
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

interface HourlyForecast {
  time: string;
  temperature: number;
  condition: string;
  weatherCode: number;
  windSpeed: number;
  precipitationChance: number;
  humidity: number;
}

interface DrillRecommendation {
  category: string;
  drills: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

function calculateSportConditions(weather: WeatherMetrics, sport: string) {
  const { temperature, humidity, windSpeed, windDirection, visibility, uvIndex } = weather;
  
  // Ball flight analysis (adjusted for sport)
  let ballFlight = "Normal flight conditions";
  if (sport === 'baseball') {
    if (temperature > 85 && humidity < 50) ballFlight = "Increased distance (+5-10ft)";
    else if (temperature < 60) ballFlight = "Reduced distance (-5-10ft)";
    else if (humidity > 70) ballFlight = "Heavy air, reduced carry (-3-5ft)";
  } else { // softball
    if (temperature > 85 && humidity < 50) ballFlight = "Increased distance (+3-7ft)";
    else if (temperature < 60) ballFlight = "Reduced distance (-3-5ft)";
    else if (humidity > 70) ballFlight = "Heavy air, reduced carry (-2-4ft)";
  }
  
  // Wind impact analysis
  let windImpact = "Minimal wind effect";
  if (windSpeed > 15) {
    windImpact = `Strong ${windDirection} wind affecting ${sport} flight significantly`;
  }
  if (windSpeed > 20) {
    windImpact = `Dangerous wind conditions (${windSpeed} mph) - practice not recommended`;
  }
  
  // Field conditions assessment
  let fieldCondition = "Excellent training conditions";
  if (temperature > 95) {
    fieldCondition = "Extreme heat warning - hydration breaks every 15 min required";
  } else if (temperature > 88) {
    fieldCondition = "Hot conditions - monitor players closely";
  } else if (temperature < 40) {
    fieldCondition = "Cold weather - reduced grip and flexibility expected";
  } else if (temperature < 32) {
    fieldCondition = "Freezing conditions - not recommended for training";
  }
  
  // UV Index warnings
  let uvWarning = "";
  if (uvIndex >= 8) uvWarning = "Very high UV - sunscreen and hats required";
  if (uvIndex >= 11) uvWarning = "Extreme UV - limit outdoor exposure";
  
  // Visibility for tracking fly balls
  const trackingCondition = visibility > 5 
    ? "Excellent visibility for tracking fly balls" 
    : "Poor visibility - difficulty tracking high pop-ups";
  
  // Overall recommendation
  const recommendation = generateRecommendation(weather);
  
  const sportName = sport === 'baseball' ? 'Baseball' : 'Softball';
  
  return {
    sport: sportName,
    ballFlight,
    windImpact,
    fieldCondition,
    trackingCondition,
    uvWarning,
    recommendation
  };
}

function generateRecommendation(weather: WeatherMetrics): string {
  const { windSpeed, temperature, uvIndex } = weather;
  
  // Critical conditions - do not train
  if (windSpeed > 25 || temperature > 100 || temperature < 30 || uvIndex > 11) {
    return "❌ Not recommended - Dangerous conditions";
  }
  
  // Caution conditions
  if (windSpeed > 15 || temperature > 90 || temperature < 40 || uvIndex > 8) {
    return "⚠️ Proceed with caution - Monitor conditions closely";
  }
  
  // Good conditions with minor considerations
  if (windSpeed > 10 || temperature > 80 || temperature < 50) {
    return "✅ Good for training - Minor adjustments recommended";
  }
  
  // Ideal conditions
  return "✅ Ideal conditions - Perfect for training";
}

function generateDailyRecommendation(
  high: number,
  low: number,
  windSpeed: number,
  precipChance: number
): { recommendation: string; color: 'green' | 'yellow' | 'red' } {
  // Critical conditions - do not train
  if (windSpeed > 25 || high > 100 || low < 30 || precipChance > 70) {
    return {
      recommendation: "❌ Not Recommended - Unsafe conditions",
      color: 'red'
    };
  }
  
  // Caution conditions
  if (windSpeed > 15 || high > 90 || low < 40 || precipChance > 40) {
    return {
      recommendation: "⚠️ Fair - Monitor conditions",
      color: 'yellow'
    };
  }
  
  // Good conditions with minor considerations
  if (windSpeed > 10 || high > 80 || low < 50 || precipChance > 20) {
    return {
      recommendation: "✅ Good - Minor adjustments needed",
      color: 'yellow'
    };
  }
  
  // Ideal conditions
  return {
    recommendation: "✅ Excellent - Ideal for training",
    color: 'green'
  };
}

function generateDrillRecommendations(
  weather: WeatherMetrics, 
  sport: string
): DrillRecommendation[] {
  const { temperature, humidity, windSpeed, windDirection, visibility, uvIndex } = weather;
  const recommendations: DrillRecommendation[] = [];
  
  // WIND-BASED DRILLS (High Priority)
  if (windSpeed >= 15) {
    recommendations.push({
      category: "Wind Training",
      drills: [
        "Wind-adjusted batting practice (account for ball movement)",
        "Outfield communication drills (calling fly balls in wind)",
        "Throwing into the wind (arm strength development)",
        "Wind-reading drills for fly balls"
      ],
      reason: `Strong ${windDirection} wind (${Math.round(windSpeed)} mph) - Perfect for wind adaptation training`,
      priority: 'high',
      icon: "💨"
    });
  } else if (windSpeed >= 10) {
    recommendations.push({
      category: "Moderate Wind Drills",
      drills: [
        "Outfield tracking with wind drift awareness",
        "Pitcher grip adjustments for wind conditions",
        "Infield pop-up communication in breeze"
      ],
      reason: `Moderate ${windDirection} wind (${Math.round(windSpeed)} mph) - Good for controlled wind practice`,
      priority: 'medium',
      icon: "🌬️"
    });
  }
  
  // HEAT-BASED DRILLS
  if (temperature > 85) {
    recommendations.push({
      category: "Heat Management Training",
      drills: [
        "Shorter, high-intensity intervals (5-10 min segments)",
        "Hydration protocol practice",
        "Mental focus drills (heat affects concentration)",
        "Base running technique (conserve energy in heat)"
      ],
      reason: `Hot conditions (${Math.round(temperature)}°F) - Focus on efficiency and hydration`,
      priority: 'high',
      icon: "🌡️"
    });
  }
  
  // COLD WEATHER DRILLS
  if (temperature < 50 && temperature >= 40) {
    recommendations.push({
      category: "Cold Weather Adaptation",
      drills: [
        "Extended warm-up routines (15-20 min)",
        "Short toss with focus on feel and grip",
        "Batting tee work (controlled swings, feel the barrel)",
        "Footwork and agility drills (keep blood flowing)"
      ],
      reason: `Cool conditions (${Math.round(temperature)}°F) - Prioritize warm-up and flexibility`,
      priority: 'medium',
      icon: "❄️"
    });
  } else if (temperature < 40) {
    recommendations.push({
      category: "Indoor/Light Training",
      drills: [
        "Film study and game review",
        "Indoor soft toss or tee work",
        "Mental preparation and visualization",
        "Light stretching and mobility work"
      ],
      reason: `Very cold (${Math.round(temperature)}°F) - Consider indoor alternatives`,
      priority: 'high',
      icon: "🏠"
    });
  }
  
  // HIGH UV DRILLS (Sun Safety)
  if (uvIndex >= 8) {
    recommendations.push({
      category: "Sun Safety Training",
      drills: [
        "Practice with hats and sunglasses (game simulation)",
        "Fly ball tracking with sun glare management",
        "Frequent water breaks every 15 minutes",
        "Shade rotation for position players"
      ],
      reason: `High UV index (${uvIndex}) - Sun protection critical`,
      priority: 'high',
      icon: "☀️"
    });
  }
  
  // POOR VISIBILITY DRILLS
  if (visibility < 5) {
    recommendations.push({
      category: "Limited Visibility Training",
      drills: [
        "Ground ball fundamentals (less reliance on tracking)",
        "Batting cage work (controlled environment)",
        "Baserunning and situational awareness",
        "Pitching bullpen sessions (pitcher focus)"
      ],
      reason: `Poor visibility (${visibility} mi) - Focus on controlled drills`,
      priority: 'medium',
      icon: "🌫️"
    });
  }
  
  // IDEAL CONDITIONS - FULL PRACTICE DRILLS
  if (
    temperature >= 60 && temperature <= 85 &&
    windSpeed < 15 &&
    uvIndex < 8 &&
    visibility >= 5
  ) {
    recommendations.push({
      category: "Full Practice Schedule",
      drills: [
        sport === 'baseball' ? "Live batting practice" : "Live hitting rounds",
        "Infield/outfield drills with game scenarios",
        "Situational scrimmages (runners on base)",
        "Baserunning and stealing practice",
        "Full bullpen sessions for pitchers",
        "Defensive positioning and cutoff drills"
      ],
      reason: `Ideal conditions (${Math.round(temperature)}°F, ${Math.round(windSpeed)} mph wind) - Perfect for comprehensive training`,
      priority: 'high',
      icon: "⭐"
    });
  }
  
  // HIGH HUMIDITY DRILLS
  if (humidity > 70) {
    recommendations.push({
      category: "Heavy Air Adjustments",
      drills: [
        "Power hitting drills (ball won't carry as far)",
        "Pitcher endurance work (heavy air = more effort)",
        "Hydration and stamina management",
        "Gap hitting instead of home run focus"
      ],
      reason: `High humidity (${humidity}%) - Heavy air affects ball flight`,
      priority: 'low',
      icon: "💧"
    });
  }
  
  return recommendations;
}

function degreesToCardinal(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

function mapWeatherCodeToDescription(code: number | undefined): string {
  if (code == null) return "Unknown";
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([66, 67].includes(code)) return "Freezing rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

function formatTimeToAMPM(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, sport } = await req.json();
    const sportType = sport || 'baseball';

    if (!location) {
      throw new Error("Location is required");
    }

    console.log(`Fetching weather for location: ${location}`);
    console.log(`Sport parameter received: ${sport} (type: ${typeof sport})`);
    console.log(`Using sportType: ${sportType}`);

    // Determine coordinates from location string
    let latitude: number | null = null;
    let longitude: number | null = null;
    let resolvedLocationName = location as string;

    const coordMatch = location.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);

    if (coordMatch) {
      latitude = parseFloat(coordMatch[1]);
      longitude = parseFloat(coordMatch[2]);
      
      // Reverse geocode coordinates to readable location name
      const reverseGeoUrl = `https://geocoding-api.open-meteo.com/v1/search?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`;
      console.log(`Reverse geocoding coordinates: ${reverseGeoUrl}`);
      
      try {
        const reverseGeoResponse = await fetch(reverseGeoUrl, {
          signal: AbortSignal.timeout(5000),
        });
        
        if (reverseGeoResponse.ok) {
          const reverseGeoData = await reverseGeoResponse.json();
          
          if (reverseGeoData.results && reverseGeoData.results.length > 0) {
            const result = reverseGeoData.results[0];
            resolvedLocationName = `${result.name}${result.country ? `, ${result.country}` : ""}`;
            console.log(`Resolved coordinates to: ${resolvedLocationName}`);
          } else {
            console.warn(`No reverse geocoding results for coordinates: ${latitude},${longitude}`);
          }
        } else {
          console.warn(`Reverse geocoding failed with status ${reverseGeoResponse.status}`);
        }
      } catch (reverseGeoError) {
        console.error(`Reverse geocoding error:`, reverseGeoError);
      }
    } else {
      // Clean up location string - Open-Meteo works better with just city names
      // Remove common patterns like ", FL", ", fl", ", Florida", etc.
      let cleanLocation = location.trim();
      const statePattern = /,\s*([A-Za-z]{2}|[A-Za-z]+)$/i;
      const cityOnly = cleanLocation.replace(statePattern, '').trim();
      
      // Try searches in order: full location, then city only
      const searchTerms = [cleanLocation];
      if (cityOnly !== cleanLocation) {
        searchTerms.push(cityOnly);
      }
      
      let geoData: any = null;
      let searchUsed = '';
      
      for (const searchTerm of searchTerms) {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5&language=en&format=json`;
        console.log(`Geocoding location via Open-Meteo: ${geoUrl}`);

        const geoResponse = await fetch(geoUrl, {
          signal: AbortSignal.timeout(10000),
        });

        if (!geoResponse.ok) {
          const errorText = await geoResponse.text();
          console.error(`Geocoding API error response: ${errorText}`);
          continue;
        }

        const data = await geoResponse.json();
        
        if (data.results && data.results.length > 0) {
          geoData = data;
          searchUsed = searchTerm;
          console.log(`Found location with search term: ${searchTerm}`);
          break;
        }
        
        console.log(`No results for search term: ${searchTerm}, trying next...`);
      }

      if (!geoData || !geoData.results || !geoData.results.length) {
        throw new Error("Location not found");
      }

      const firstResult = geoData.results[0];
      latitude = firstResult.latitude;
      longitude = firstResult.longitude;
      resolvedLocationName = `${firstResult.name}${firstResult.admin1 ? `, ${firstResult.admin1}` : ''}${firstResult.country ? `, ${firstResult.country}` : ""}`;
      console.log(`Resolved location: ${resolvedLocationName}`);
    }

    if (latitude == null || longitude == null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new Error("Invalid location coordinates");
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability,weather_code,uv_index,visibility&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=7`;
    console.log(`Open-Meteo Weather API URL: ${weatherUrl}`);

    const response = await fetch(weatherUrl, {
      signal: AbortSignal.timeout(10000),
    });

    console.log(`Open-Meteo response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Open-Meteo error response: ${errorText}`);
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.current) {
      console.error(`Invalid Open-Meteo response structure: ${JSON.stringify(data).substring(0, 200)}`);
      throw new Error("Weather API returned incomplete data");
    }

    const current = data.current;
    const hourly = data.hourly || {};
    const uvValues: number[] = hourly.uv_index || [];
    const visibilityValues: number[] = hourly.visibility || [];

    const uvIndex = uvValues.length ? uvValues[0] : 0;
    const visibilityKm = visibilityValues.length ? visibilityValues[0] / 1000 : 10; // visibility in meters -> km
    const visibilityMiles = Math.round(visibilityKm * 0.621371);

    const temperatureF = current.temperature_2m * 9 / 5 + 32;
    const feelsLikeF = current.apparent_temperature != null ? current.apparent_temperature * 9 / 5 + 32 : temperatureF;
    const windSpeedMph = current.wind_speed_10m != null ? Math.round(current.wind_speed_10m * 0.621371) : 0;

    const windDirectionDeg = current.wind_direction_10m;
    const windDirection = typeof windDirectionDeg === "number" ? degreesToCardinal(windDirectionDeg) : "N/A";

    const weatherMetrics: WeatherMetrics = {
      temperature: temperatureF,
      humidity: current.relative_humidity_2m ?? 0,
      windSpeed: windSpeedMph,
      windDirection,
      visibility: visibilityMiles,
      uvIndex: uvIndex ?? 0,
    };

    // Process hourly forecast data (next 33 hours)
    const hourlyForecasts: HourlyForecast[] = [];
    const hourlyTimes: string[] = hourly.time || [];
    const hourlyTemps: number[] = hourly.temperature_2m || [];
    const hourlyHumidity: number[] = hourly.relative_humidity_2m || [];
    const hourlyWindSpeed: number[] = hourly.wind_speed_10m || [];
    const hourlyPrecipProb: number[] = hourly.precipitation_probability || [];
    const hourlyWeatherCode: number[] = hourly.weather_code || [];
    
    // Use current.time from Open-Meteo (already in location's local timezone)
    // This avoids timezone mismatch issues with server UTC vs location local time
    const currentTimeStr = current.time; // e.g., "2024-12-19T14:00"
    const currentHourIndex = hourlyTimes.findIndex((time: string) => {
      return time >= currentTimeStr;
    });
    
    const startIndex = Math.max(0, currentHourIndex);
    for (let i = startIndex; i < Math.min(startIndex + 33, hourlyTimes.length); i++) {
      const tempC = hourlyTemps[i] ?? 0;
      const tempF = tempC * 9 / 5 + 32;
      const windSpeedKmh = hourlyWindSpeed[i] ?? 0;
      const windSpeedMph = windSpeedKmh * 0.621371;
      
      hourlyForecasts.push({
        time: hourlyTimes[i],
        temperature: Math.round(tempF),
        condition: mapWeatherCodeToDescription(hourlyWeatherCode[i]),
        weatherCode: hourlyWeatherCode[i] ?? 0,
        windSpeed: Math.round(windSpeedMph),
        precipitationChance: Math.round(hourlyPrecipProb[i] ?? 0),
        humidity: Math.round(hourlyHumidity[i] ?? 0),
      });
    }

    // Process daily forecast data
    const daily = data.daily || {};
    const dailyForecasts: DailyForecast[] = [];

    if (daily.time && daily.time.length > 0) {
      for (let i = 0; i < Math.min(daily.time.length, 7); i++) {
        const highC = daily.temperature_2m_max?.[i] ?? 0;
        const lowC = daily.temperature_2m_min?.[i] ?? 0;
        const highF = highC * 9 / 5 + 32;
        const lowF = lowC * 9 / 5 + 32;
        const windSpeedKmh = daily.wind_speed_10m_max?.[i] ?? 0;
        const windSpeedMph = windSpeedKmh * 0.621371;
        const precipChance = daily.precipitation_probability_max?.[i] ?? 0;
        const weatherCode = daily.weather_code?.[i] ?? 0;
        
        const { recommendation, color } = generateDailyRecommendation(
          highF,
          lowF,
          windSpeedMph,
          precipChance
        );
        
        dailyForecasts.push({
          date: daily.time[i],
          high: Math.round(highF),
          low: Math.round(lowF),
          condition: mapWeatherCodeToDescription(weatherCode),
          weatherCode,
          windSpeedMax: Math.round(windSpeedMph),
          precipitationChance: Math.round(precipChance),
          recommendation,
          recommendationColor: color
        });
      }
    }

    // Extract sunrise and sunset times (from first day)
    const sunrise = daily.sunrise?.[0] ? formatTimeToAMPM(daily.sunrise[0]) : null;
    const sunset = daily.sunset?.[0] ? formatTimeToAMPM(daily.sunset[0]) : null;

    // Extract timezone abbreviation
    const timezone = data.timezone_abbreviation || data.timezone || null;

    const weatherData = {
      location: resolvedLocationName,
      ...weatherMetrics,
      feelsLike: feelsLikeF,
      condition: mapWeatherCodeToDescription(current.weather_code),
      sportAnalysis: calculateSportConditions(weatherMetrics, sportType),
      dailyForecast: dailyForecasts,
      hourlyForecast: hourlyForecasts,
      drillRecommendations: generateDrillRecommendations(weatherMetrics, sportType),
      sunrise,
      sunset,
      timezone
    };

    return new Response(JSON.stringify(weatherData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-weather function:", error);
    const errorMessage = error instanceof Error 
      ? error.name === 'TimeoutError' 
        ? "Weather service is taking too long to respond. Please try again in a moment."
        : error.message 
      : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: error instanceof Error && error.name === 'TimeoutError' ? 504 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
