import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readHammerCard(fileName: string): string {
  return readFileSync(resolve(__dirname, "..", fileName), "utf8");
}

describe("Hammers Today card hook order", () => {
  it("keeps WkConditioningCard state hooks before early returns", () => {
    const source = readHammerCard("WkConditioningCard.tsx");
    const openHook = source.indexOf("const [open, setOpen] = useState<boolean>(false);");
    const gameDayReturn = source.indexOf("if (gp.gameToday) return null;");
    const emptyReturn = source.indexOf("if (!isLoading && items.length === 0 && !failed) return null;");

    expect(openHook).toBeGreaterThan(-1);
    expect(gameDayReturn).toBeGreaterThan(-1);
    expect(emptyReturn).toBeGreaterThan(-1);
    expect(openHook).toBeLessThan(gameDayReturn);
    expect(openHook).toBeLessThan(emptyReturn);
  });

  it("keeps WkLiftsCard hooks before the game-day early return", () => {
    const source = readHammerCard("WkLiftsCard.tsx");
    const budgetHook = source.indexOf("const budget = useArmCareBudget();");
    const openHook = source.indexOf("const [open, setOpen] = useState<boolean>(false);");
    const gameDayReturn = source.indexOf("if (gp.gameToday) {");

    expect(budgetHook).toBeGreaterThan(-1);
    expect(openHook).toBeGreaterThan(-1);
    expect(gameDayReturn).toBeGreaterThan(-1);
    expect(budgetHook).toBeLessThan(gameDayReturn);
    expect(openHook).toBeLessThan(gameDayReturn);
  });
});