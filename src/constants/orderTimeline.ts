import { colors } from '@/constants/colors';

export const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo_para_retirar: 'Listo para retirar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${min}`;
  } catch {
    return '—';
  }
}

export function getStatusColor(status: string, border: string): string {
  switch (status) {
    case 'pendiente':
      return colors.accent;
    case 'confirmado':
      return colors.success;
    case 'en_preparacion':
    case 'listo_para_retirar':
      return colors.info;
    case 'entregado':
      return colors.success;
    case 'cancelado':
      return colors.brandRedCoral;
    default:
      return border;
  }
}

export const STATUS_COLORS: Record<string, string> = {
  pendiente: '#f59e0b',
  confirmado: '#22c55e',
  en_preparacion: '#3b82f6',
  listo_para_retirar: '#3b82f6',
  entregado: '#22c55e',
  cancelado: '#DE393A',
};
