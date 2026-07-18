// src/hooks/useMediaQuery.ts
// ponytail: simple window matchMedia hook, no debounce, no ResizeObserver.
// Add debounce if resize events cause layout thrash.

import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface Breakpoints {
  mobile: boolean;  // < 640px
  tablet: boolean;  // 640px - 1023px
  desktop: boolean; // >= 1024px
}

function getBreakpoints(width: number): Breakpoints {
  return {
    mobile: width < 640,
    tablet: width >= 640 && width < 1024,
    desktop: width >= 1024,
  };
}

/**
 * Hook that returns current viewport breakpoints.
 *
 * On native (RN), defaults to mobile breakpoints since the app
 * is primarily mobile-first. On web, uses window.matchMedia.
 */
export function useMediaQuery(): Breakpoints {
  // Native platforms default to mobile
  if (Platform.OS !== 'web') {
    return { mobile: true, tablet: false, desktop: false };
  }

  const [bp, setBp] = useState<Breakpoints>(() =>
    getBreakpoints(typeof window !== 'undefined' ? window.innerWidth : 640),
  );

  const handleResize = useCallback(() => {
    setBp(getBreakpoints(window.innerWidth));
  }, []);

  useEffect(() => {
    // Use matchMedia for better performance
    const mql = window.matchMedia('(min-width: 640px) and (max-width: 1023px)');
    const mqlDesktop = window.matchMedia('(min-width: 1024px)');

    const handler = () => handleResize();
    mql.addEventListener('change', handler);
    mqlDesktop.addEventListener('change', handler);
    window.addEventListener('resize', handler);

    return () => {
      mql.removeEventListener('change', handler);
      mqlDesktop.removeEventListener('change', handler);
      window.removeEventListener('resize', handler);
    };
  }, [handleResize]);

  return bp;
}
