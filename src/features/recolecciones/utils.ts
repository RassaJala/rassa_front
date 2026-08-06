import { formatFechaHeader as formatFechaHeaderCommon } from '@/common/utils/recolecciones';

import { DIAS } from './constants';
export {
  buildDuplicateKeys,
  getFullName,
  ocupaFechaParaDuplicado,
  recoleccionDuplicateKey,
  validateProgramarForm,
  type NombreAgricultor,
  type ProgramarFormValues,
} from '@/common/utils/recolecciones';
export {
  addDays,
  formatHora,
  isValidFecha,
  isValidFechaFormato,
  isValidHora,
  normalizeHora,
  parseFecha,
  todayString,
  toDateString,
} from '@/common/utils/recolecciones';

export function formatFechaHeader(fecha: string, today: string): string {
  return formatFechaHeaderCommon(fecha, today, DIAS);
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function toLocalDateString(
  year: number,
  month: number,
  day: number,
): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function hexWithAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const OVERLAY_RGBA = 'rgba(0,0,0,0.5)';
