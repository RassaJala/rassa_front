import { useMemo } from 'react';

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

function getNextMonday(from: Date): Date {
  const d = new Date(from);
  const dayOfWeek = d.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

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
