"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void; mounted: boolean }>({
  theme: "light",
  toggle: () => {},
  mounted: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always initialize to "light" for both SSR and the initial hydration pass to guarantee tree matching
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const isDarkDOM = root.classList.contains("dark");
    const stored = localStorage.getItem("fos-theme") as Theme | null;

    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      if (stored === "dark" && !isDarkDOM) root.classList.add("dark");
      if (stored === "light" && isDarkDOM) root.classList.remove("dark");
    } else if (isDarkDOM) {
      setTheme("dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      root.classList.add("dark");
    }
    setMounted(true);
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    // Enable velvety smooth CSS transitions during explicit theme toggle
    root.classList.add("theme-transitioning");

    setTheme((prevTheme) => {
      const nextTheme = prevTheme === "light" ? "dark" : "light";
      if (nextTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      localStorage.setItem("fos-theme", nextTheme);
      return nextTheme;
    });

    // Remove the transition class after animation finishes to prevent lag on subsequent resizes/reloads
    setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 350);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}
