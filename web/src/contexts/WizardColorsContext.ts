import { createContext, useContext } from 'react';
import type { useAppColors } from '../hooks/useAppColors';

export type WizardColors = ReturnType<typeof useAppColors>;

export const WizardColorsContext = createContext<WizardColors | null>(null);

export function useWizardColors(): WizardColors {
  const ctx = useContext(WizardColorsContext);
  if (!ctx) throw new Error('useWizardColors must be used within WizardColorsProvider');
  return ctx;
}
