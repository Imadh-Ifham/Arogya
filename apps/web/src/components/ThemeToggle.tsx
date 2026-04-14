import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getInitialTheme, setTheme, type ThemeMode } from "../app/theme";

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const initial = getInitialTheme();
    setMode(initial);
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-card hover:bg-secondary transition-colors text-foreground"
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={mode === "dark" ? "Light mode" : "Dark mode"}
    >
      {mode === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

