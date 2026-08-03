import { formatearFecha } from '@/common/dates';
import type { SettlementPago } from '@/common/settlements';
import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/utils/money';

interface SettlementPagoCardProps {
  pago: SettlementPago;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}

export function SettlementPagoCard({ pago }: SettlementPagoCardProps) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Pago registrado
        </h3>
        <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-green-forest dark:bg-green-950 dark:text-green-400">
          {pago.folio}
        </span>
      </div>
      <Row label="Tipo de pago" value={pago.tipo_pago_nombre} />
      <Row label="Monto" value={formatMoney(pago.monto)} />
      <Row label="Fecha" value={formatearFecha(pago.fecha_pago)} />
      {pago.referencia && <Row label="Referencia" value={pago.referencia} />}
    </Card>
  );
}
