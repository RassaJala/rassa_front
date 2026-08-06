import { COMISION_RASSA, resolveSettlementAmounts } from '@/common/settlements';
import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/utils/money';

interface SettlementBreakdownProps {
  montoVentas: string;
  comision: string;
  montoLiquidar: string;
  // Backend tasa_comision (DecimalField(decimal_places=4)) when the payload
  // includes it — the rate the label shows and the resolver uses to derive
  // comision when the server omits it.
  tasaComision?: string | number | null | undefined;
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

// WARN-5: render the rate without lying — Math.round would turn 12.5% into
// "13%". Keep up to 4 decimals and trim trailing zeros ("12.5", "10", "12.34").
function formatRatePercent(value: number): string {
  return Number.parseFloat(value.toFixed(4)).toString();
}

export function SettlementBreakdown({
  montoVentas,
  comision,
  montoLiquidar,
  tasaComision,
}: SettlementBreakdownProps) {
  // The server monto_liquidar is authoritative (it reflects backend rounding);
  // the shared resolver only recomputes monto_ventas − comision for malformed
  // payloads, so the list and detail always show identical numbers (CONV-1).
  // The resolver prefers the backend tasa_comision over the COMISION_RASSA
  // fallback when comision is missing, so the derived rate matches reality.
  const amounts = resolveSettlementAmounts({
    monto_ventas: montoVentas,
    comision,
    monto_liquidar: montoLiquidar,
    tasa_comision: tasaComision,
  });
  // WARN-5: prefer the backend's declared rate; fall back to the effective
  // comision/ventas ratio (server data when present, the derivation otherwise).
  const rawTasa =
    tasaComision === null || tasaComision === undefined || tasaComision === ''
      ? NaN
      : Number.parseFloat(String(tasaComision));
  const tasaValida = Number.isFinite(rawTasa);
  const ratePercent = tasaValida
    ? rawTasa * 100
    : amounts.montoVentas > 0
      ? (amounts.comision / amounts.montoVentas) * 100
      : COMISION_RASSA * 100;
  const comisionLabel = `Comisión Rassa (${formatRatePercent(ratePercent)}%)`;

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
