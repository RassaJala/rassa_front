// Shared waste-dashboard domain: types, date/aggregation helpers and constants.
// Used by both the mobile app (src/services/waste.ts, MermaResumenScreen) and the
// web app (web/src/services/waste.ts, AdminMermasDashboard).

import { MONTH_NAMES } from './dates';
import { buildListUrl, unwrapEnvelope } from './http';
import { API_RETRY_LIMIT } from './networking';

// --- Types -------------------------------------------------------------------

export interface MermaResumenItem {
  periodo: string;
  producto_nombre: string;
  producto_id: number;
  decision_nombre: string;
  decision_id: number;
  total_cantidad: number;
  total_mermas: number;
}

export interface MermaResumenResponse {
  agrupacion: 'mes' | 'semana';
  total_general: number;
  producto_mas_afectado: { nombre: string; total: number } | null;
  detalle: MermaResumenItem[];
}

export interface ResumenParams {
  fecha_desde?: string;
  fecha_hasta?: string;
  producto_id?: number;
  agrupar_por?: 'mes' | 'semana';
}

export interface ProductOption {
  id: number;
  nombre: string;
}

// --- Constants ---------------------------------------------------------------

export const DAY_MS = 86_400_000;
export const WASTE_PAGE_SIZE = 10;
export const WASTE_DETAIL_LIMIT = 100;
export const WASTE_RETRY_LIMIT = API_RETRY_LIMIT;
export const WASTE_STALE_TIME_MS = 5 * 60 * 1000;

// Decision strings shared by the mobile and web dashboards.
export const DECISION_DONAR = 'donar';
export const DECISION_TIRAR = 'tirar';
export const DECISION_COMPOSTAR = 'compostar';

export type DecisionMerma =
  typeof DECISION_DONAR | typeof DECISION_TIRAR | typeof DECISION_COMPOSTAR;

// --- Date helpers ------------------------------------------------------------
// Backend sends full ISO datetimes ("2026-07-01T00:00:00-03:00"); only the date
// part matters. parseDate is a direct alias of toLocalDate (kept as a
// backward-compatible name for callers that only pass strict YYYY-MM-DD).

export function toLocalDate(iso: string): Date | null {
  const datePart = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const [y, m, d] = datePart.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function parseDate(raw: string): Date | null {
  return toLocalDate(raw);
}

// Backend sends bare dates ("2026-08-10") that must not be parsed with
// `new Date()` (UTC midnight shifts the day back in negative-offset zones).
// Shared by both apps so the timezone fix lives in exactly one place (W1).
// Falls back to "now" for malformed input, with a dev warning (W3).
// Uses a globalThis guard (not `process`) so the package typechecks in both
// the RN app and the web tsconfig, which does not include Node types.
function isNonProduction(): boolean {
  const env = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
    .process?.env?.NODE_ENV;
  return env !== 'production';
}

export function parseLocalDate(iso: string): Date {
  const d = toLocalDate(iso);
  if (d === null) {
    if (isNonProduction()) {
      console.warn('[parseLocalDate] invalid date input:', iso);
    }
    return new Date();
  }
  return d;
}

// Backend rule: publications can only be created/edited on Monday
// (rassa_back views use `timezone.localdate().weekday() != 0`).
export function isMondayToday(date: Date = new Date()): boolean {
  return date.getDay() === 1;
}

// Next Monday from `from` (or today if it's already Monday), time zeroed.
// Shared (W1): was duplicated mobile `useFormattedDate` / web `publicationWizard`.
export function getNextMonday(from: Date = new Date()): Date {
  const d = new Date(from);
  const dayOfWeek = d.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ISO 8601 week number — matches Django's TruncWeek (Monday-based).
export function getWeekNumber(date: Date): number {
  const target = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = target.getUTCDay() || 7; // Monday = 1 ... Sunday = 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum); // move to Thursday
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

export function getMonthLabel(iso: string): string {
  const d = toLocalDate(iso);
  if (!d || isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
}

export function getWeekLabel(iso: string): string {
  const d = toLocalDate(iso);
  if (!d || isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
  return `Sem ${getWeekNumber(d)} (${day})`;
}

export function periodLabel(iso: string, agrupacion: string): string {
  return agrupacion === 'semana' ? getWeekLabel(iso) : getMonthLabel(iso);
}

export function formatDisplayDate(iso: string): string {
  const d = toLocalDate(iso);
  if (!d || isNaN(d.getTime())) return iso;
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()] ?? ''} ${d.getFullYear()}`;
}

// Local YYYY-MM-DD for <input type="date"> max/values (avoids UTC off-by-one).
export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toDateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function parseInitialDate(
  dateStr?: string,
): { year: number; month: number; day: number } | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const parts = dateStr.split('-').map(Number);
  return {
    year: parts[0] ?? new Date().getFullYear(),
    month: (parts[1] ?? 1) - 1,
    day: parts[2] ?? 1,
  };
}

// --- Aggregations ------------------------------------------------------------

export function groupBy<T>(
  items: T[],
  key: (x: T) => string,
  sum: (x: T) => number,
): { nombre: string; total: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(key(item), (map.get(key(item)) ?? 0) + sum(item));
  }
  return Array.from(map.entries())
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);
}

export function extractProducts(detalle: MermaResumenItem[]): ProductOption[] {
  const seen = new Map<number, string>();
  for (const d of detalle) {
    if (!seen.has(d.producto_id)) {
      seen.set(d.producto_id, d.producto_nombre);
    }
  }
  return Array.from(seen.entries()).map(([id, nombre]) => ({ id, nombre }));
}

// Stable hash used to pick a fallback color for unknown decision names.
export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// --- Envelope + query builder ------------------------------------------------

export interface WasteEnvelope<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

// Unwrap the {ok, data} envelope returned by the merma endpoints. Throws when
// ok === false or data is missing (including null — see unwrapEnvelope).
export function unwrapWasteEnvelope<T>(envelope: {
  ok: boolean;
  data?: T;
  message?: string;
}): T {
  return unwrapEnvelope<T>(envelope);
}

// Build the /mermas/resumen/ URL with the query params the backend expects
// (fecha_desde, fecha_hasta, producto_id, agrupar_por).
export function buildResumenUrl(params: ResumenParams): string {
  return buildListUrl('/mermas/resumen/', {
    fecha_desde: params.fecha_desde,
    fecha_hasta: params.fecha_hasta,
    producto_id: params.producto_id,
    agrupar_por: params.agrupar_por,
  });
}

// --- Decision colors ----------------------------------------------------------
// One algorithm for both apps: platform-specific color tokens are supplied via
// the palette (hex on mobile, Tailwind classes on web).

export interface DecisionPalette {
  donar: string;
  tirar: string;
  compostar: string;
  fallback: readonly string[];
  defaultColor: string;
}

// Default hex palette used by the mobile app when no palette is passed. The
// 'donar' and 'tirar' entries mirror the admBrand (#24563C) and brandRedCoral
// (#DE393A) tokens from the mobile theme; they are kept as literals so
// packages/common has no dependency on the mobile theme constants.
export const DEFAULT_DECISION_PALETTE: DecisionPalette = {
  donar: '#24563C',
  tirar: '#DE393A',
  compostar: '#CED295',
  fallback: [
    '#E46C38',
    '#D52E7A',
    '#EEAA6F',
    '#B2C2B2',
    '#AEC0BC',
    '#A19FB6',
    '#24563C',
    '#D8D3C8',
  ],
  defaultColor: '#9CA3AF',
};

export function getDecisionColor(
  decision: string,
  palette: DecisionPalette = DEFAULT_DECISION_PALETTE,
): string {
  const key = decision.toLowerCase().trim();
  if (key === DECISION_DONAR) return palette.donar;
  if (key === DECISION_TIRAR) return palette.tirar;
  if (key === DECISION_COMPOSTAR) return palette.compostar;
  const idx = hashString(key) % palette.fallback.length;
  return palette.fallback[idx] ?? palette.defaultColor;
}
