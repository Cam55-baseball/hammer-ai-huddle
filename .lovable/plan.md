

## Plan — Recognize Baseball Fields & Parks in Weather Search

### Problem
The Weather search calls Open-Meteo's geocoding API (`geocoding-api.open-meteo.com`), which only indexes cities, towns, and administrative places. It cannot resolve venue names like "Yankee Stadium", "Steinbrenner Field", "TD Ballpark", local high school fields, or little league complexes.

### Approach
Add a **POI-aware geocoding layer** in front of the existing city/ZIP/coords resolution in `supabase/functions/get-weather/index.ts`. Use **OpenStreetMap Nominatim** (free, no key) which indexes named ballparks, stadiums, sports complexes, and athletic fields across the entire US (sourced from OSM tags `leisure=pitch sport=baseball/softball`, `leisure=stadium`, `name=*`).

### Resolution order (new)
1. ZIP code (existing) — unchanged.
2. Coordinates (existing) — unchanged.
3. **NEW: Venue/POI lookup via Nominatim** — runs first for any free-text query. Biased to US (`countrycodes=us`), prefers results tagged as stadium/pitch/park, falls back gracefully.
4. Open-Meteo city geocoding (existing) — fallback if Nominatim returns nothing.

### Edge function changes (`supabase/functions/get-weather/index.ts`)
- Insert a new block after the coord check and before line 551's city-cleaning logic.
- Skip Nominatim if input matches obvious city-only pattern after a quick heuristic? No — always try Nominatim first for free text; it handles cities too, but we still prefer Open-Meteo for plain city names to keep behavior identical. Strategy:
  - If query contains keywords suggesting a venue (`field|park|stadium|ballpark|complex|diamond|coliseum|arena|sports`) **OR** is multi-word with capitalized proper-noun pattern → try Nominatim first.
  - Otherwise → Open-Meteo first, Nominatim as fallback.
- Nominatim call:
  ```
  https://nominatim.openstreetmap.org/search?q=<query>&countrycodes=us&format=json&limit=5&addressdetails=1&extratags=1
  ```
  Required header: `User-Agent: HammersWeather/1.0 (contact@hammers.app)` (Nominatim usage policy).
- Pick the best result: prefer entries where `class=leisure` and `type ∈ {stadium, pitch, park, sports_centre}`, or `extratags.sport=baseball|softball`. Otherwise take the top result.
- Extract `lat`, `lon`, build `resolvedLocationName` as `display_name` trimmed to first 3 comma parts (e.g., "Yankee Stadium, East 161st Street, Bronx").
- Log every step for debugging.
- Update the error message at line 598 to: `Try a field name (e.g., "Yankee Stadium"), city, or ZIP code.`

### Rate-limit & resilience
- Nominatim allows ~1 req/sec per app — fine for our usage. Add a 5s timeout and graceful fallback to Open-Meteo on any failure (no thrown error from Nominatim alone).
- Cache: existing weather caching by resolved coords already handles repeats.

### UI changes (`src/components/WeatherWidget.tsx`)
- Update the search input placeholder to: `"Search field, park, stadium, city, or ZIP…"` so users know the new capability exists.
- No other UI changes needed — the existing search flow passes the raw string to the edge function.

### Out of scope
- No autocomplete dropdown (would require a separate suggestions endpoint and rate-limit handling). Free-text resolution only.
- No new database tables or caching layer beyond what exists.
- No API key requirement (Nominatim is free).

### Verification
- Search "Yankee Stadium" → resolves to Bronx, NY weather.
- Search "Steinbrenner Field" → resolves to Tampa, FL weather.
- Search "Tampa" → still resolves correctly (city fallback intact).
- Search "33601" → ZIP path unchanged.
- Search a small local field by name (e.g., "Al Lopez Park Tampa") → Nominatim resolves it.
- Invalid input → clear updated error message.

