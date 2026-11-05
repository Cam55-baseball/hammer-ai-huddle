import "../i18n";
import "../index.css";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import { BulkSendDialog } from "@/components/coach/BulkSendDialog";
import { SendToPlayerDialog } from "@/components/custom-activities/SendToPlayerDialog";
import { AuthProvider } from "@/contexts/AuthContext";
const qc = new QueryClient();
const mode = new URLSearchParams(location.search).get("m");
function H() {
  const [o, setO] = useState(true);
  const tpl = { id: "t1", title: "Proof lift", activity_type: "workout", sport: "baseball", icon: "dumbbell", intensity: "standard", coach_card_category: "lift",
    exercises: Array.from({ length: 6 }, (_, i) => ({ id: `e${i}`, name: `Goblet squat ${i + 1}`, type: "strength", sets: 3, reps: 8 })) } as any;
  return mode === "send" ? <SendToPlayerDialog open={o} onOpenChange={setO} template={tpl} initialPlayerIds={["p1"]} /> :
    <BulkSendDialog open={o} onOpenChange={setO} selectedPlayerIds={["p1"]} selectedPlayerNames={["Proof Player"]} />;
}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={qc}><MemoryRouter><AuthProvider><H /></AuthProvider></MemoryRouter></QueryClientProvider>);
