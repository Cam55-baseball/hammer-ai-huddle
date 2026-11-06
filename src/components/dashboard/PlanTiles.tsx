// Owner Nov 6 r5: Dashboard plan tiles. "Unlocked" comes only from the shared activePlans judge
// (heldPlans); a Golden 2Way holder sees the other two tiles as parts of that one plan.
import { CircleDot, Target, Zap, Lock, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TIER_CONFIG } from "@/constants/tiers";
import { scrubRetiredFromList } from "../../../supabase/functions/_shared/archive/retiredPrograms";
import { openWebsiteCheckout } from "@/lib/purchase/websiteHandoff";

type Tier = "pitcher" | "5tool" | "golden2way";

export function PlanTiles({ isTierUnlocked, heldPlans, canShowPurchaseUI, purchaseMode, programsRetired, onSelect, onUnlock }: {
  isTierUnlocked: (tier: string) => boolean;
  heldPlans: readonly string[];
  canShowPurchaseUI: boolean;
  purchaseMode: string;
  programsRetired: boolean;
  onSelect: (tier: Tier) => void;
  onUnlock: (tier: Tier) => void;
}) {
  return (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 module-cards">
    {([
      { tier: 'pitcher', Icon: CircleDot, title: 'Complete Pitcher', desc: 'Pitching Analysis, Heat Factory, Ask the Coach', topBadge: null as string | null },
      { tier: '5tool', Icon: Zap, title: '5Tool Player', desc: 'Hitting + Throwing Analysis, Iron Bambino, Speed Lab, Tex Vision', topBadge: 'Most Popular' },
      { tier: 'golden2way', Icon: Target, title: 'The Golden 2Way', desc: 'Everything + The Unicorn workout system', topBadge: 'Best Value' },
    ] as const).map(({ tier, Icon: ModIcon, title, desc: rawDesc, topBadge }) => {
      const desc = programsRetired ? scrubRetiredFromList(rawDesc) : rawDesc;
      const unlocked = isTierUnlocked(tier);
      // Owner Nov 6 r5: a Golden 2Way holder holds ONE plan. The other tiles are its parts, not
      // extra unlocked plans and not something to buy again.
      const partOfGolden = !unlocked && tier !== 'golden2way' && heldPlans.includes('golden2way');
      const price = TIER_CONFIG[tier]?.price;
      return (
        <Card
          key={tier}
          className={`p-2 sm:p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] module-card ${
            !unlocked
              ? "border-2 border-dashed border-primary/40 hover:border-primary/70"
              : "border-primary/40 border-2"
          }`}
          onClick={() => onSelect(tier)}
          data-plan-tile={tier}
          data-plan-state={unlocked ? 'unlocked' : partOfGolden ? 'part-of-golden2way' : 'locked'}
        >
          <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-4">
            <div className="p-2 sm:p-4 rounded-full bg-primary/10">
              <ModIcon className="h-7 w-7 sm:h-12 sm:w-12 text-primary" />
            </div>
            {unlocked ? (
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-600 border border-emerald-500/40">
                <Check className="h-3 w-3 mr-1" /> Unlocked
              </Badge>
            ) : partOfGolden ? (
              <Badge variant="outline" className="text-[10px]">Part of your Golden 2Way</Badge>
            ) : topBadge && canShowPurchaseUI ? (
              <Badge className="bg-primary text-primary-foreground text-xs">{topBadge}</Badge>
            ) : null}
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              {title}
              {!unlocked && !partOfGolden && <Lock className="h-5 w-5" />}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground">{desc}</p>
            {unlocked ? (
              <Button
                variant="outline"
                className="w-full h-11 border-primary/40 text-foreground hover:bg-primary/5"
              >
                <ModIcon className="h-4 w-4 sm:mr-2" /> Start Training
              </Button>
            ) : partOfGolden ? (
              <Button variant="outline" className="w-full h-11">Open this part</Button>
            ) : !canShowPurchaseUI ? (
              <p className="text-xs text-muted-foreground">Not available on your account yet</p>
            ) : purchaseMode === "native-linkout" ? (
              <Button
                className="w-full h-11 font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  void openWebsiteCheckout("/pricing").catch(() =>
                    toast.error("Couldn't open the website. Please try again."),
                  );
                }}
              >
                Subscribe on our website
              </Button>
            ) : (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlock(tier);
                }}
                className="w-full h-12 font-bold uppercase tracking-wide text-primary-foreground border-0
                           bg-[linear-gradient(110deg,hsl(var(--primary)),hsl(45_100%_55%),hsl(var(--primary)))]
                           bg-[length:200%_100%] animate-gradient-shift
                           shadow-[0_0_24px_hsl(var(--primary)/0.45)]
                           hover:shadow-[0_0_36px_hsl(var(--primary)/0.65)] hover:scale-[1.03]"
              >
                <Sparkles className="h-4 w-4 sm:mr-2 animate-pulse" />
                Unlock Now!
              </Button>
            )}
          </div>
        </Card>
      );
    })}
  </div>
  );
}
