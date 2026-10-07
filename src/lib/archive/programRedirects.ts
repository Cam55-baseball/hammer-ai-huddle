/**
 * Step 9 — program retirement redirects (PREPARED, NOT ACTIVE).
 * Nothing imports this yet. Switching it on, removing menu items, and changing
 * pricing/help text all wait for the owner's explicit OK. Nothing is deleted.
 * Destinations are the plan cards that now hold each program's content.
 */
export const PROGRAM_REDIRECTS_ENABLED = false as const;

export const PROGRAM_REDIRECTS: ReadonlyArray<{ from: string; to: string; program: string; card: string }> = [
  { from: "/speed-lab", to: "/hammers-today#speed", program: "Speed Lab", card: "Speed card" },
  { from: "/explosive-conditioning", to: "/hammers-today#conditioning", program: "Explosive Conditioning", card: "Conditioning card" },
  { from: "/the-unicorn", to: "/hammers-today#lift", program: "The Unicorn", card: "Lift card" },
  { from: "/iron-bambino", to: "/hammers-today#lift", program: "Iron Bambino", card: "Lift card" },
  { from: "/heat-factory", to: "/hammers-today#throwing", program: "Heat Factory", card: "Throwing card" },
];
