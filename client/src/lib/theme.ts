import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";

export type AppTheme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: AppTheme;
  resolvedTheme: Exclude<AppTheme, "system">;
  primaryColor: string;
  setTheme: (theme: AppTheme) => void;
  setPrimaryColor: (color: string) => void;
};

const THEME_STORAGE_KEY = "theme";
const LEGACY_THEME_STORAGE_KEY = "app-theme";
const PRIMARY_STORAGE_KEY = "primary-color";
const LEGACY_PRIMARY_STORAGE_KEY = "app-primary-color";
const DEFAULT_PRIMARY_COLOR = "#2563eb";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): Exclude<AppTheme, "system"> {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: AppTheme): Exclude<AppTheme, "system"> {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(theme: AppTheme) {
  const resolvedTheme = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
}


function applyPrimaryColor(color: string) {
  document.documentElement.style.setProperty("--primary-color", color);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window === "undefined") return "system";
    const storedTheme = (localStorage.getItem(THEME_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_THEME_STORAGE_KEY)) as AppTheme | null;
    return storedTheme ?? "system";
  });

  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_PRIMARY_COLOR;
    return (
      localStorage.getItem(PRIMARY_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_PRIMARY_STORAGE_KEY) ??
      DEFAULT_PRIMARY_COLOR
    );
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);

    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  useEffect(() => {
    applyPrimaryColor(primaryColor);
    localStorage.setItem(PRIMARY_STORAGE_KEY, primaryColor);
    localStorage.removeItem(LEGACY_PRIMARY_STORAGE_KEY);
  }, [primaryColor]);

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      primaryColor,
      setTheme: setThemeState,
      setPrimaryColor: setPrimaryColorState,
    }),
    [theme, resolvedTheme, primaryColor],
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}

export const presetPrimaryColors = ["#2563eb", "#16a34a", "#9333ea", "#ea580c", "#dc2626"];
