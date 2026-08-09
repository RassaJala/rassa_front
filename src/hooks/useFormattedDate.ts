import { useMemo } from 'react';

import { getNextMonday } from '@/common/waste';

const days = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const months = [
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

export function useFormattedDate(): {
  today: string;
  nextMonday: string;
  nextMondayDate: Date;
} {
  return useMemo(() => {
    const d = new Date();
    const today = `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
    const nm = getNextMonday(d);
    const nextMonday = `${days[nm.getDay()]}, ${nm.getDate()} de ${months[nm.getMonth()]}`;
    return { today, nextMonday, nextMondayDate: nm };
  }, []);
}
