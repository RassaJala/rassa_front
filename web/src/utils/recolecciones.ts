import { formatFechaHeader as formatFechaHeaderCommon } from '@/common/utils/recolecciones';

import { DIAS } from '../constants/recolecciones';
export {
  buildDuplicateKeys,
  esRecoleccionDuplicada,
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

export function nombreCompletoAgricultor(a: {
  readonly nombre: string;
  readonly apellido_paterno: string;
  readonly apellido_materno: string | null;
}): string {
  return getFullName(a);
}

export function formatFechaHeader(fecha: string, today: string): string {
  return formatFechaHeaderCommon(fecha, today, DIAS);
}
