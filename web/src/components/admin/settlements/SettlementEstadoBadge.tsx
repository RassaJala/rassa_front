import { ESTADO_PAGADA } from '@/common/settlements';
import type { SettlementEstado } from '@/common/settlements';
import { Badge } from '@/components/ui/Badge';

interface SettlementEstadoBadgeProps {
  estado: SettlementEstado;
}

export function SettlementEstadoBadge({ estado }: SettlementEstadoBadgeProps) {
  const pagada = estado === ESTADO_PAGADA;
  return (
    <Badge variant={pagada ? 'success' : 'warning'}>
      {pagada ? 'Pagada' : 'Pendiente'}
    </Badge>
  );
}
