import { Card } from '@/components/ui/Card';
import { formatMoney, parseMoney } from '@/utils/money';

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
  // the recomputed monto_ventas − comision only guards malformed payloads
  // where monto_liquidar is absent or invalid, so the UI never renders $NaN
  // (JD-004, R3).
  const aLiquidar = parseMoney(montoLiquidar);
  const fallback =
    aLiquidar > 0 ? aLiquidar : parseMoney(montoVentas) - parseMoney(comision);

  return (
    <Card>
      <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
        Desglose
      </h3>
      <Row label="Monto de ventas" value={formatMoney(montoVentas)} />
      <Row label="Comisión Rassa (10%)" value={formatMoney(comision)} />
      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
      <Row label="A liquidar" value={formatMoney(fallback)} strong />
    </Card>
  );
}
