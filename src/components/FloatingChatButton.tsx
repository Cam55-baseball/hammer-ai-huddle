import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpDeskChat } from "./HelpDeskChat";
import { branding } from "@/branding";

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full p-0 shadow-lg transition-all hover:scale-110"
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <img src={branding.logo} alt="Help Desk" className="h-8 w-8 object-contain rounded-full" />
        )}
      </Button>

      {/* Help Desk Chat Widget */}
      {isOpen && <HelpDeskChat onClose={() => setIsOpen(false)} />}
    </>
  );
}
