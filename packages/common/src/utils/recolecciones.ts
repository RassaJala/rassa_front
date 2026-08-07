import { MONTH_NAMES } from '../dates';

// ── Types ───────────────────────────────────────────────────

export interface NombreAgricultor {
  readonly nombre: string;
  readonly apellido_paterno: string;
  readonly apellido_materno: string | null;
}

export interface RecoleccionDuplicadoCandidate {
  readonly estado: string;
  readonly fk_agricultor: number | null;
  readonly fecha_recoleccion: string;
}

export interface ProgramarFormValues {
  readonly agricultorSeleccionado: boolean;
  readonly fecha: string;
  readonly horaInicio: string;
  readonly horaFin: string;
}

// ── Name helpers ────────────────────────────────────────────

export function getFullName(a: NombreAgricultor): string {
  return [a.nombre, a.apellido_paterno, a.apellido_materno]
    .filter(Boolean)
    .join(' ');
}

// ── Date helpers ────────────────────────────────────────────

export function toDateString(d: Date): string {
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${month}-${day}`;
}

export function todayString(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

const FECHA_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidFechaFormato(fecha: string): boolean {
  return FECHA_REGEX.test(fecha);
}

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
  const [anio, mes, dia] = fecha.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(anio, mes - 1, dia));
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

export function formatFechaHeader(
  fecha: string,
  today: string,
  diasSemana: readonly string[],
): string {
  if (fecha === today) return 'Hoy';
  const todayDate = parseFecha(today);
  const manana = todayDate
    ? toDateString(addDays(todayDate, 1))
    : toDateString(addDays(parseFecha(todayString())!, 1));
  if (fecha === manana) return 'Mañana';
  const date = parseFecha(fecha);
  if (!date) return fecha;
  return `${diasSemana[date.getUTCDay()] ?? ''}, ${date.getUTCDate()} de ${(
    MONTH_NAMES[date.getUTCMonth()] ?? ''
  ).toLowerCase()}`;
}

// ── Time helpers ────────────────────────────────────────────

export function formatHora(hora: string | null): string {
  if (!hora) return '';
  return hora.slice(0, 5);
}

export function isValidHora(raw: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(raw)) return false;
  const [h, m] = raw.split(':').map(Number);
  return (h ?? 0) <= 23 && (m ?? 0) <= 59;
}

export function normalizeHora(raw: string): string | null {
  return isValidHora(raw) ? `${raw}:00` : null;
}

// ── Duplicate detection ─────────────────────────────────────

export function recoleccionDuplicateKey(
  fkAgricultor: number,
  fecha: string,
): string {
  return `${fkAgricultor}|${fecha}`;
}

export function ocupaFechaParaDuplicado(
  r: RecoleccionDuplicadoCandidate,
): r is RecoleccionDuplicadoCandidate & { readonly fk_agricultor: number } {
  return r.estado !== 'cancelado' && r.fk_agricultor != null;
}

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

// ── Form validation ─────────────────────────────────────────

export function validateProgramarForm(
  values: ProgramarFormValues,
  today?: string,
): string | null {
  if (!values.agricultorSeleccionado) return 'Selecciona un agricultor.';
  if (!isValidFechaFormato(values.fecha)) {
    return 'La fecha debe tener el formato AAAA-MM-DD.';
  }
  if (!isValidFecha(values.fecha)) {
    return 'La fecha ingresada no es válida.';
  }
  if (values.fecha < (today ?? todayString())) {
    return 'La fecha no puede ser anterior a hoy.';
  }
  if (values.horaInicio && !isValidHora(values.horaInicio)) {
    return 'La hora de inicio debe tener el formato HH:MM.';
  }
  if (values.horaFin && !isValidHora(values.horaFin)) {
    return 'La hora de fin debe tener el formato HH:MM.';
  }
  if (values.horaFin && !values.horaInicio) {
    return 'La hora de fin requiere una hora de inicio.';
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
