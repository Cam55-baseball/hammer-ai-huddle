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

    // Determine coordinates from location string
    let latitude: number | null = null;
    let longitude: number | null = null;
    let resolvedLocationName = location as string;

    const coordMatch = location.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);

    if (coordMatch) {
      latitude = parseFloat(coordMatch[1]);
      longitude = parseFloat(coordMatch[2]);
    } else {
      // Geocode city name to coordinates using Open-Meteo geocoding API
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
      console.log(`Geocoding location via Open-Meteo: ${geoUrl}`);

      const geoResponse = await fetch(geoUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (!geoResponse.ok) {
        const errorText = await geoResponse.text();
        console.error(`Geocoding API error response: ${errorText}`);
        throw new Error(`Location lookup failed with status ${geoResponse.status}`);
      }

      const geoData = await geoResponse.json();

      if (!geoData.results || !geoData.results.length) {
        throw new Error("Location not found");
      }

      const firstResult = geoData.results[0];
      latitude = firstResult.latitude;
      longitude = firstResult.longitude;
      resolvedLocationName = `${firstResult.name}${firstResult.country ? `, ${firstResult.country}` : ""}`;
    }

    if (latitude == null || longitude == null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new Error("Invalid location coordinates");
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code&hourly=uv_index,visibility&timezone=auto`;
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
    const visibilityMiles = visibilityKm * 0.621371;

    const temperatureF = current.temperature_2m * 9 / 5 + 32;
    const feelsLikeF = current.apparent_temperature != null ? current.apparent_temperature * 9 / 5 + 32 : temperatureF;
    const windSpeedMph = current.wind_speed_10m != null ? current.wind_speed_10m * 0.621371 : 0;

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

    const weatherData = {
      location: resolvedLocationName,
      ...weatherMetrics,
      feelsLike: feelsLikeF,
      condition: mapWeatherCodeToDescription(current.weather_code),
      sportAnalysis: calculateSportConditions(weatherMetrics, sportType),
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
