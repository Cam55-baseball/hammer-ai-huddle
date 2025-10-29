import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWidget } from "./ChatWidget";
import logo from "@/assets/logo.png";

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
          <img src={logo} alt="Chat" className="h-8 w-8 object-contain rounded-full" />
        )}
      </Button>

      {/* Chat Widget */}
      {isOpen && <ChatWidget onClose={() => setIsOpen(false)} />}
    </>
  );
}
