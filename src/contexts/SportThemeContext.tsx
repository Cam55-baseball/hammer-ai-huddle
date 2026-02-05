import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type SportType = "baseball" | "softball";

interface SportThemeContextType {
  sport: SportType;
  isSoftball: boolean;
}

const SportThemeContext = createContext<SportThemeContextType>({
  sport: "baseball",
  isSoftball: false,
});

export function useSportTheme() {
  return useContext(SportThemeContext);
}

// Helper function to dispatch sport change event
export function dispatchSportChange(newSport: SportType) {
  localStorage.setItem("selectedSport", newSport);
  window.dispatchEvent(new CustomEvent("sportChanged", { detail: { sport: newSport } }));
}

export function SportThemeProvider({ children }: { children: ReactNode }) {
  const [sport, setSport] = useState<SportType>(() => {
    const saved = localStorage.getItem("selectedSport");
    return saved === "softball" ? "softball" : "baseball";
  });

  // Apply data-sport attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute("data-sport", sport);
    return () => {
      document.documentElement.removeAttribute("data-sport");
    };
  }, [sport]);

   // Listen for sport changes via custom event (replaces polling)
  useEffect(() => {
     const handleSportChange = (e: CustomEvent<{ sport: SportType }>) => {
       setSport(e.detail.sport);
     };
     
     // Also listen for storage events from other tabs
     const handleStorageEvent = (e: StorageEvent) => {
       if (e.key === "selectedSport") {
         const newSport = e.newValue === "softball" ? "softball" : "baseball";
         setSport(newSport);
       }
     };
     
     // Check localStorage on mount in case it changed before listener was added
     const checkLocalStorage = () => {
      const saved = localStorage.getItem("selectedSport");
       const newSport = saved === "softball" ? "softball" : "baseball";
       if (newSport !== sport) {
         setSport(newSport);
       }
    };
     
     checkLocalStorage();
     
     window.addEventListener("sportChanged", handleSportChange as EventListener);
     window.addEventListener("storage", handleStorageEvent);
     
    return () => {
       window.removeEventListener("sportChanged", handleSportChange as EventListener);
       window.removeEventListener("storage", handleStorageEvent);
    };
  }, [sport]);

  return (
    <SportThemeContext.Provider value={{ sport, isSoftball: sport === "softball" }}>
      {children}
    </SportThemeContext.Provider>
  );
}
