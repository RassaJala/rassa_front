import { DIAS, MESES } from './constants';

export function toDateString(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

const FECHA_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Valida estrictamente una fecha "AAAA-MM-DD" como día real del calendario.
 * `new Date()` normaliza fechas imposibles (p. ej. 2026-02-31 -> 3 de marzo),
 * por lo que se compara contra el valor redondeado en UTC para rechazarlas.
 */
export function isValidFecha(fecha: string): boolean {
  const match = FECHA_REGEX.exec(fecha);
  if (!match) return false;
  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  const date = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    date.getUTCFullYear() === anio &&
    date.getUTCMonth() === mes - 1 &&
    date.getUTCDate() === dia
  );
}

export function parseFecha(fecha: string): Date | null {
  if (!isValidFecha(fecha)) return null;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio ?? 0, (mes ?? 1) - 1, dia ?? 1);
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function formatFechaHeader(fecha: string, today: string): string {
  if (fecha === today) return 'Hoy';
  const manana = parseFecha(today)
    ? toDateString(addDays(parseFecha(today) as Date, 1))
    : toDateString(addDays(new Date(), 1));
  if (fecha === manana) return 'Mañana';
  const date = parseFecha(fecha);
  if (!date) return fecha;
  return `${DIAS[date.getDay()] ?? ''}, ${date.getDate()} de ${
    MESES[date.getMonth()] ?? ''
  }`;
}

export function formatHora(hora: string | null): string {
  if (!hora) return '';
  return hora.slice(0, 5);
}

export function isValidHora(raw: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(raw)) return false;
  const [h, m] = raw.split(':').map(Number);
  return (h ?? 0) <= 23 && (m ?? 0) <= 59;
}

export function normalizeHora(raw: string): string {
  return `${raw}:00`;
}

export function recoleccionDuplicateKey(
  fkAgricultor: number,
  fecha: string,
): string {
  return `${fkAgricultor}|${fecha}`;
}
