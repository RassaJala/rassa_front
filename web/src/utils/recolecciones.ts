import { formatFechaHeader as formatFechaHeaderCommon } from '@/common/utils/recolecciones';

import { DIAS } from '../constants/recolecciones';
export {
  buildDuplicateKeys,
  esRecoleccionDuplicada,
  getFullName as nombreCompletoAgricultor,
  ocupaFechaParaDuplicado,
  recoleccionDuplicateKey,
  validateProgramarForm,
  type NombreAgricultor,
  type ProgramarFormValues,
  type RecoleccionDuplicadoCandidate,
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
