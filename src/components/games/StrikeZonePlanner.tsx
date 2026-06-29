/**
 * StrikeZonePlanner — tag each zone attack/avoid/take. Saves into
 * gp_pitcher_dossiers.strike_zone_plan (jsonb keyed "1".."9").
 */
import { StrikeZoneGrid, type Zone, type ZoneTag } from "./StrikeZoneGrid";

type PlanMap = Partial<Record<Zone, ZoneTag>>;

export function StrikeZonePlanner({
  value,
  onChange,
}: {
  value: Record<string, "attack" | "avoid" | "take"> | null | undefined;
  onChange: (next: Record<string, "attack" | "avoid" | "take">) => void;
}) {
  const tags: PlanMap = {};
  if (value) {
    (Object.keys(value) as string[]).forEach((k) => {
      const n = Number(k) as Zone;
      if (n >= 1 && n <= 9) tags[n] = value[k];
    });
  }

  return (
    <StrikeZoneGrid
      tags={tags}
      onTagChange={(z, next) => {
        const out: Record<string, "attack" | "avoid" | "take"> = { ...(value ?? {}) };
        if (next === null) delete out[String(z)];
        else out[String(z)] = next;
        onChange(out);
      }}
      size={240}
    />
  );
}
