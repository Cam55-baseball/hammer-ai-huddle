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

    // Using wttr.in free weather API (no key required)
    const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch weather data");
    }

    const data = await response.json();
    const current = data.current_condition[0];
    const locationInfo = data.nearest_area[0];

    const weatherMetrics = {
      temperature: parseFloat(current.temp_F),
      humidity: parseFloat(current.humidity),
      windSpeed: parseFloat(current.windspeedMiles),
      windDirection: current.winddir16Point,
      visibility: parseFloat(current.visibilityMiles),
      uvIndex: parseFloat(current.uvIndex),
    };

    const weatherData = {
      location: `${locationInfo.areaName[0].value}, ${locationInfo.country[0].value}`,
      ...weatherMetrics,
      feelsLike: parseFloat(current.FeelsLikeF),
      condition: current.weatherDesc[0].value,
      sportAnalysis: calculateSportConditions(weatherMetrics, sportType),
    };

    return new Response(JSON.stringify(weatherData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-weather function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
