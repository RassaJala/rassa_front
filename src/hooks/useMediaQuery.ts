// src/hooks/useMediaQuery.ts
// ponytail: simple window matchMedia hook, no debounce, no ResizeObserver.
// Add debounce if resize events cause layout thrash.

import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

/* global window -- declared because TS lib excludes dom in RN projects */

export interface Breakpoints {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
}

function getBreakpoints(width: number): Breakpoints {
  return {
    mobile: width < 640,
    tablet: width >= 640 && width < 1024,
    desktop: width >= 1024,
  };
}

export function useMediaQuery(): Breakpoints {
  const [bp, setBp] = useState<Breakpoints>(() => {
    if (Platform.OS !== "web")
      return { mobile: true, tablet: false, desktop: false };
    return getBreakpoints(window.innerWidth);
  });

  const handleResize = useCallback(() => {
    if (Platform.OS !== "web" || !window) return;
    setBp(getBreakpoints(window.innerWidth));
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || !window) return;

    const mql = window.matchMedia("(min-width: 640px) and (max-width: 1023px)");
    const mqlDesktop = window.matchMedia("(min-width: 1024px)");

    const handler = () => handleResize();
    mql.addEventListener("change", handler);
    mqlDesktop.addEventListener("change", handler);
    window.addEventListener("resize", handler);

    return () => {
      mql.removeEventListener("change", handler);
      mqlDesktop.removeEventListener("change", handler);
      window.removeEventListener("resize", handler);
    };
  }, [handleResize]);

  return bp;
}
