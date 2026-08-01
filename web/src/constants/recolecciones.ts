import type { RecoleccionEstado } from '../types/recolecciones';

export const DIAS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export const FILTROS: ReadonlyArray<{
  readonly label: string;
  readonly value: RecoleccionEstado | '';
}> = [
  { label: 'Todos', value: '' },
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'En ruta', value: 'en_ruta' },
  { label: 'Recolectado', value: 'recolectado' },
  { label: 'Cancelado', value: 'cancelado' },
];

export const ESTADO_LABELS: Record<RecoleccionEstado, string> = {
  pendiente: 'Pendiente',
  en_ruta: 'En ruta',
  recolectado: 'Recolectado',
  cancelado: 'Cancelado',
};

export const TRANSICIONES: Readonly<
  Record<RecoleccionEstado, readonly RecoleccionEstado[]>
> = {
  pendiente: ['en_ruta', 'cancelado'],
  en_ruta: ['recolectado', 'cancelado'],
  recolectado: [],
  cancelado: [],
};

export const ESTADO_COLORS: Readonly<
  Record<RecoleccionEstado, { readonly bg: string; readonly fg: string }>
> = {
  pendiente: { bg: '#FFF4E5', fg: '#B45309' },
  en_ruta: { bg: '#E0F2FE', fg: '#0369A1' },
  recolectado: { bg: '#DCFCE7', fg: '#15803D' },
  cancelado: { bg: '#FEE2E2', fg: '#B91C1C' },
};
