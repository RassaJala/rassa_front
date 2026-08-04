import { COMISION_RASSA, resolveSettlementAmounts } from '@/common/settlements';
import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/utils/money';

interface SettlementBreakdownProps {
  montoVentas: string;
  comision: string;
  montoLiquidar: string;
}

interface RowProps {
  label: string;
  value: string;
  strong?: boolean;
}

function Row({ label, value, strong = false }: RowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`text-sm ${strong ? 'text-lg font-bold text-brand-green-forest' : 'font-semibold text-gray-900 dark:text-gray-100'}`}
      >
        {value}
      </span>
    </div>
  );
}

export function SettlementBreakdown({
  montoVentas,
  comision,
  montoLiquidar,
}: SettlementBreakdownProps) {
  // The server monto_liquidar is authoritative (it reflects backend rounding);
  // the shared resolver only recomputes monto_ventas − comision for malformed
  // payloads, so the list and detail always show identical numbers (CONV-1).
  const amounts = resolveSettlementAmounts({
    monto_ventas: montoVentas,
    comision,
    monto_liquidar: montoLiquidar,
  });
  // WARN-5: the backend does not send tasa_comision — derive the label from
  // the resolved comision/monto_ventas ratio (server data when present, the
  // COMISION_RASSA derivation otherwise).
  const ratePercent =
    amounts.montoVentas > 0
      ? (amounts.comision / amounts.montoVentas) * 100
      : COMISION_RASSA * 100;
  const comisionLabel = `Comisión Rassa (${Math.round(ratePercent)}%)`;

  return (
    <Card>
      <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
        Desglose
      </h3>
      <Row label="Monto de ventas" value={formatMoney(amounts.montoVentas)} />
      <Row label={comisionLabel} value={formatMoney(amounts.comision)} />
      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
      <Row
        label="A liquidar"
        value={formatMoney(amounts.montoLiquidar)}
        strong
      />
      {amounts.isEstimated && (
        <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
          Valores estimados: algunos montos no fueron provistos por el servidor.
        </p>
      )}
    </Card>
  );
}
