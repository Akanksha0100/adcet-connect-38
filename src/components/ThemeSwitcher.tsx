/**
 * ThemeSwitcher — compact dropdown showing 5 theme options with color swatches
 * and a dark mode toggle.
 */
import { Palette, Moon, Sun, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { THEMES, useTheme, type ThemeId } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";

const ThemeSwitcher = () => {
  const { theme, darkMode, setTheme, toggleDarkMode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Change theme"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Theme
        </div>
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id as ThemeId)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="flex gap-1">
              {t.colors.map((c, i) => (
                <span
                  key={i}
                  className="inline-block w-3.5 h-3.5 rounded-full border border-border/50"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <span className="flex-1 text-sm">{t.label}</span>
            {theme === t.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Check className="h-3.5 w-3.5 text-primary" />
              </motion.div>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={toggleDarkMode}
          className="flex items-center gap-3 cursor-pointer"
        >
          {darkMode ? (
            <Sun className="h-4 w-4 text-amber-500" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-500" />
          )}
          <span className="flex-1 text-sm">
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSwitcher;
