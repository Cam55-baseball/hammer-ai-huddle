// The merch square (unchanged look and behavior). Owner Nov 7: back on the Dashboard, directly below "Find Your Training Plan".
import { useTranslation } from "react-i18next";
import { ShoppingBag, Sparkles, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const MERCH_URL = "https://hammers-modality-shop.fourthwall.com";

export function MerchTile() {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6">
      {/* Merch Card - Premium Visual Design */}
      <Card
        className="p-2 sm:p-6 hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02]
                   bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10
                   border-2 border-amber-500/30 hover:border-amber-500/50
                   relative overflow-hidden group"
        onClick={() => window.open(MERCH_URL, '_blank')}
        data-merch-tile
      >
          {/* Animated background shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
                          translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

          <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-4 relative z-10">
            {/* Icon with pulse animation */}
            <div className="p-2 sm:p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20
                            animate-pulse-gentle">
              <ShoppingBag className="h-7 w-7 sm:h-12 sm:w-12 text-amber-600" />
            </div>

            {/* Title with sparkle badge */}
            <div className="relative">
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600
                             bg-clip-text text-transparent flex items-center gap-2">
                {t('dashboard.modules.merch')}
                <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              </h3>
              <Badge className="absolute -top-2 -right-8 bg-gradient-to-r from-red-500 to-orange-500
                                text-white text-[10px] px-1.5 py-0.5 animate-bounce-subtle">
                {t('dashboard.modules.merchNew')}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('dashboard.modules.merchDescription')}
            </p>

            {/* Promotional tagline */}
            <div className="text-xs text-amber-600 font-medium">
              {t('dashboard.modules.merchTagline')}
            </div>

            {/* CTA Button */}
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600
                         hover:to-orange-600 text-white font-semibold shadow-lg
                         hover:shadow-amber-500/30 transition-all"
            >
              <ShoppingBag className="h-4 w-4 sm:mr-2" />
              <span className="hidden xs:inline">{t('dashboard.modules.shopNow')}</span>
              <span className="xs:hidden">{t('dashboard.modules.shop')}</span>
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>
        </Card>
    </div>
  );
}
