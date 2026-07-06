import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPreferences } from "./lib/preferences";
import { initTheme } from "./contexts/ThemeContext";

// Apply theme before React renders to prevent FOUC
initTheme();
initPreferences();

createRoot(document.getElementById("root")!).render(<App />);
