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
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${min}`;
  } catch {
    return '—';
  }
}

export function getStatusColor(status: string, fallback: string): string {
  switch (status) {
    case 'pendiente':
      return '#f59e0b';
    case 'confirmado':
      return '#22c55e';
    case 'en_preparacion':
    case 'listo_para_retirar':
      return '#3b82f6';
    case 'entregado':
      return '#22c55e';
    case 'cancelado':
      return '#DE393A';
    default:
      return fallback;
  }
}
