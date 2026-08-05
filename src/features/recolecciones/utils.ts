import { formatFechaHeader as formatFechaHeaderCommon } from '@/common/utils/recolecciones';
import type { AgricultorAgricultorItem } from '@/hooks/useAgricultoresUbicacion';

import { DIAS } from './constants';
export {
  buildDuplicateKeys,
  esRecoleccionDuplicada,
  ocupaFechaParaDuplicado,
  recoleccionDuplicateKey,
  validateProgramarForm,
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

export function getFullName(a: AgricultorAgricultorItem): string {
  return [a.nombre, a.apellido_paterno, a.apellido_materno]
    .filter(Boolean)
    .join(' ');
}
