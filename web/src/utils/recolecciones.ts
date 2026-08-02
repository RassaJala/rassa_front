import { DIAS, MESES } from '../constants/recolecciones';

export function toDateString(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

const FECHA_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Valida únicamente el formato "AAAA-MM-DD", sin comprobar el día del calendario. */
export function isValidFechaFormato(fecha: string): boolean {
  return FECHA_REGEX.test(fecha);
}

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
  const todayDate = parseFecha(today);
  const manana = todayDate
    ? toDateString(addDays(todayDate, 1))
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

interface RecoleccionDuplicadoCandidate {
  readonly estado: string;
  readonly fk_agricultor: number | null;
  readonly fecha_recoleccion: string;
}

/**
 * Predicado único de la regla de duplicado: una recolección ocupa su fecha
 * salvo que esté cancelada o no tenga agricultor. Lo comparten el mock, el
 * modal y `esRecoleccionDuplicada` para que la validación nunca diverja.
 */
export function ocupaFechaParaDuplicado(
  r: RecoleccionDuplicadoCandidate,
): r is RecoleccionDuplicadoCandidate & { readonly fk_agricultor: number } {
  return r.estado !== 'cancelado' && r.fk_agricultor != null;
}

/**
 * Regla única de duplicado: no puede haber dos recolecciones no canceladas del
 * mismo agricultor en la misma fecha. La usa el mock (handlers.ts); el modal
 * comparte el predicado `ocupaFechaParaDuplicado` vía `buildDuplicateKeys`
 * para que la validación de duplicados nunca diverja.
 */
export function esRecoleccionDuplicada(
  recolecciones: readonly RecoleccionDuplicadoCandidate[],
  fkAgricultor: number | null,
  fecha: string,
): boolean {
  if (fkAgricultor == null) return false;
  return recolecciones.some(
    (r) =>
      ocupaFechaParaDuplicado(r) &&
      r.fk_agricultor === fkAgricultor &&
      r.fecha_recoleccion === fecha,
  );
}

/** Conjunto de claves de duplicado para marcar agricultores ya programados. */
export function buildDuplicateKeys(
  recolecciones: readonly RecoleccionDuplicadoCandidate[],
): Set<string> {
  const keys = new Set<string>();
  for (const r of recolecciones) {
    if (ocupaFechaParaDuplicado(r)) {
      keys.add(recoleccionDuplicateKey(r.fk_agricultor, r.fecha_recoleccion));
    }
  }
  return keys;
}

export interface ProgramarFormValues {
  readonly agricultorSeleccionado: boolean;
  readonly fecha: string;
  readonly horaInicio: string;
  readonly horaFin: string;
}

/**
 * Validaciones del formulario de programación, en orden de aparición. Devuelve
 * el primer mensaje de error o `null` si el formulario es válido.
 */
export function validateProgramarForm(
  values: ProgramarFormValues,
): string | null {
  if (!values.agricultorSeleccionado) return 'Selecciona un agricultor.';
  if (!isValidFechaFormato(values.fecha)) {
    return 'La fecha debe tener el formato AAAA-MM-DD.';
  }
  if (!isValidFecha(values.fecha)) {
    return 'La fecha ingresada no es válida.';
  }
  if (values.fecha < todayString()) {
    return 'La fecha no puede ser anterior a hoy.';
  }
  if (values.horaInicio && !isValidHora(values.horaInicio)) {
    return 'La hora de inicio debe tener el formato HH:MM.';
  }
  if (values.horaFin && !isValidHora(values.horaFin)) {
    return 'La hora de fin debe tener el formato HH:MM.';
  }
  if (
    values.horaInicio &&
    values.horaFin &&
    values.horaFin <= values.horaInicio
  ) {
    return 'La hora de fin debe ser posterior a la de inicio.';
  }
  return null;
}
