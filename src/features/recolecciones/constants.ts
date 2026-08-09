import type { RecoleccionEstado } from '@/types/recolecciones';

export const DIAS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
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
