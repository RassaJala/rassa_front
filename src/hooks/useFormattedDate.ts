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

export function useFormattedDate(): { today: string } {
  return useMemo(() => {
    const d = new Date();
    const today = `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;

    return { today };
  }, []);
}
