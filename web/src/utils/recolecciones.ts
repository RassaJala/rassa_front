import { DIAS } from '../constants/recolecciones';
export { buildDuplicateKeys, esRecoleccionDuplicada, ocupaFechaParaDuplicado, recoleccionDuplicateKey, validateProgramarForm, type ProgramarFormValues } from '@/common/utils/recolecciones';
export { addDays, formatHora, isValidFecha, isValidFechaFormato, isValidHora, normalizeHora, parseFecha, todayString, toDateString } from '@/common/utils/recolecciones';
import { formatFechaHeader as formatFechaHeaderCommon } from '@/common/utils/recolecciones';

export function nombreCompletoAgricultor(a: {
  readonly nombre: string;
  readonly apellido_paterno: string;
  readonly apellido_materno: string | null;
}): string {
  return [a.nombre, a.apellido_paterno, a.apellido_materno]
    .filter(Boolean)
    .join(' ');
}

export function formatFechaHeader(fecha: string, today: string): string {
  return formatFechaHeaderCommon(fecha, today, DIAS);
}
