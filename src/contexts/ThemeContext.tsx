/**
 * ThemeContext — manages theme selection and dark mode.
 * Stores locally in localStorage and syncs to backend preferences.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";

export const THEMES = [
  { id: "default", label: "Default", colors: ["#1e3a5f", "#2d8a6e"] },
  { id: "ocean", label: "Ocean Blue", colors: ["#1565c0", "#00acc1"] },
  { id: "sunset", label: "Sunset Warm", colors: ["#d84315", "#f9a825"] },
  { id: "forest", label: "Forest Green", colors: ["#2e7d32", "#689f38"] },
  { id: "royal", label: "Royal Purple", colors: ["#6a1b9a", "#d81b60"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

interface ThemeState {
  theme: ThemeId;
  darkMode: boolean;
  setTheme: (theme: ThemeId) => void;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const STORAGE_KEY = "adcet:theme:v1";
const ThemeCtx = createContext<ThemeState | null>(null);

const readStored = (): { theme: ThemeId; darkMode: boolean } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: parsed.theme || "default",
        darkMode: !!parsed.darkMode,
      };
    }
  } catch { /* ignore */ }
  return { theme: "default", darkMode: false };
};

const applyTheme = (theme: ThemeId, darkMode: boolean) => {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (darkMode) root.classList.add("dark");
  else root.classList.remove("dark");
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState(readStored);

  // Apply on mount and changes
  useEffect(() => {
    applyTheme(state.theme, state.darkMode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setTheme = useCallback((theme: ThemeId) => {
    setState((prev) => ({ ...prev, theme }));
    // Fire-and-forget backend sync
    api.patch("/profiles/me/preferences", { theme }).catch(() => {});
  }, []);

  const setDarkMode = useCallback((darkMode: boolean) => {
    setState((prev) => ({ ...prev, darkMode }));
    api.patch("/profiles/me/preferences", { darkMode }).catch(() => {});
  }, []);

  const toggleDarkMode = useCallback(() => {
    setState((prev) => {
      const darkMode = !prev.darkMode;
      api.patch("/profiles/me/preferences", { darkMode }).catch(() => {});
      return { ...prev, darkMode };
    });
  }, []);

  const value = useMemo<ThemeState>(
    () => ({ ...state, setTheme, toggleDarkMode, setDarkMode }),
    [state, setTheme, toggleDarkMode, setDarkMode],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
};

/** Call once before React renders to prevent FOUC. */
export const initTheme = () => {
  const { theme, darkMode } = readStored();
  applyTheme(theme, darkMode);
};
