import { formatFechaHeader as formatFechaHeaderCommon } from '@/common/utils/recolecciones';
import { DIAS } from './constants';
export { buildDuplicateKeys, esRecoleccionDuplicada, ocupaFechaParaDuplicado, recoleccionDuplicateKey, validateProgramarForm, type ProgramarFormValues } from '@/common/utils/recolecciones';
export { addDays, formatHora, isValidFecha, isValidFechaFormato, isValidHora, normalizeHora, parseFecha, todayString, toDateString } from '@/common/utils/recolecciones';

export function formatFechaHeader(fecha: string, today: string): string {
  return formatFechaHeaderCommon(fecha, today, DIAS);
}
