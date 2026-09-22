"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.add("light");
      setIsLight(true);
    }
  }, []);

  const toggle = () => {
    const html = document.documentElement;
    if (isLight) {
      html.classList.remove("light");
      localStorage.setItem("theme", "dark");
      setIsLight(false);
    } else {
      html.classList.add("light");
      localStorage.setItem("theme", "light");
      setIsLight(true);
    }
  };

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggle}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
    >
      {isLight ? (
        <>
          <Moon className="w-4 h-4 shrink-0" />
          Mode Gelap
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 shrink-0" />
          Mode Terang
        </>
      )}
    </button>
  );
}
