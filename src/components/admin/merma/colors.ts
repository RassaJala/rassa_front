// Re-export the shared decision-color algorithm with its default hex palette so
// existing imports (getDecisionColor from './colors') keep working unchanged.
export { getDecisionColor } from '@/common/waste';

// Palette shared by every merma component. Screens build one AdminPalette and
// pass it down as a single prop instead of drilling individual color props.
export interface AdminPalette {
  surface: string;
  fg: string;
  muted: string;
  border: string;
  brand: string;
  bg: string;
  segBg: string;
  coral: string;
}
