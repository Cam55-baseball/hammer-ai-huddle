import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location } = await req.json();

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

    const weatherData = {
      location: `${locationInfo.areaName[0].value}, ${locationInfo.country[0].value}`,
      temperature: parseFloat(current.temp_F),
      feelsLike: parseFloat(current.FeelsLikeF),
      condition: current.weatherDesc[0].value,
      humidity: parseFloat(current.humidity),
      windSpeed: parseFloat(current.windspeedMiles),
      windDirection: current.winddir16Point,
      visibility: parseFloat(current.visibilityMiles),
      uvIndex: parseFloat(current.uvIndex),
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
