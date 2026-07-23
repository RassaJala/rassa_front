import type { ReactNode } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

import { useColorScheme as useNativewindScheme } from "nativewind";

import * as Storage from "@/services/storage";

const THEME_STORAGE_KEY = "color_scheme_preference";

type ThemePreference = "light" | "dark" | "system";
type ResolvedScheme = "light" | "dark";

interface ThemeContextValue {
  colorScheme: ResolvedScheme;
  themePreference: ThemePreference;
  isLoaded: boolean;
  toggleColorScheme: () => void;
  setThemePreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
}: Readonly<{ children: ReactNode }>): React.JSX.Element {
  const osScheme = useColorScheme(); // React Native — sigue al OS automáticamente
  const { setColorScheme: setNativewindScheme } = useNativewindScheme();

  const [preference, setPreference] = useState<ThemePreference>("system");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedTheme(): Promise<void> {
      const saved = await Storage.getItemAsync(THEME_STORAGE_KEY);

      if (cancelled) return;

      if (saved === "light" || saved === "dark" || saved === "system") {
        setPreference(saved);
      }

      setIsLoaded(true);
    }

    void loadSavedTheme();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sincroniza NativeWind cuando cambia la preferencia o el OS
  useEffect(() => {
    if (preference === "system") {
      setNativewindScheme(osScheme ?? "light");
    } else {
      setNativewindScheme(preference);
    }
  }, [preference, osScheme, setNativewindScheme]);

  const resolvedScheme: ResolvedScheme = useMemo(() => {
    if (preference === "system") {
      return (osScheme as ResolvedScheme) ?? "light";
    }
    return preference;
  }, [preference, osScheme]);

  const toggleColorScheme = useCallback(() => {
    const next: ResolvedScheme = resolvedScheme === "dark" ? "light" : "dark";
    setPreference(next);
    void Storage.setItemAsync(THEME_STORAGE_KEY, next);
  }, [resolvedScheme]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setPreference(pref);
    void Storage.setItemAsync(THEME_STORAGE_KEY, pref);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorScheme: resolvedScheme,
      themePreference: preference,
      isLoaded,
      toggleColorScheme,
      setThemePreference,
    }),
    [
      resolvedScheme,
      preference,
      isLoaded,
      toggleColorScheme,
      setThemePreference,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de un ThemeProvider");
  }

  return ctx;
}
