/** Settings entry for "Legal & privacy" — only while legal_v2 is on for this person. */
import { Link } from "react-router-dom";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLegalV2 } from "@/lib/legal/legalV2";

export function LegalSettingsLink() {
  const { on } = useLegalV2();
  if (!on) return null;
  return (
    <Button asChild variant="outline" className="h-auto min-h-[44px] w-full justify-start whitespace-normal py-2 text-left">
      <Link to="/settings/legal"><Scale className="mr-2 h-4 w-4 shrink-0" /><span>Legal & privacy — cancel, download, delete, your choices</span></Link>
    </Button>
  );
}
