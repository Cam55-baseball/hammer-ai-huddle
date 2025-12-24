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

  // Listen for localStorage changes (when sport is switched elsewhere)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("selectedSport");
      setSport(saved === "softball" ? "softball" : "baseball");
    };

    // Check periodically for changes (since storage events don't fire in the same tab)
    const interval = setInterval(() => {
      const saved = localStorage.getItem("selectedSport");
      const newSport = saved === "softball" ? "softball" : "baseball";
      if (newSport !== sport) {
        setSport(newSport);
      }
    }, 500);

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [sport]);

  return (
    <SportThemeContext.Provider value={{ sport, isSoftball: sport === "softball" }}>
      {children}
    </SportThemeContext.Provider>
  );
}
