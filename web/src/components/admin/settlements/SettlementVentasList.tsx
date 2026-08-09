import type { SettlementVenta } from '@/common/settlements';
import { formatDisplayDate } from '@/common/waste';
import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/utils/money';

interface SettlementVentasListProps {
  ventas: SettlementVenta[];
}

export function SettlementVentasList({ ventas }: SettlementVentasListProps) {
  if (ventas.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Sin ventas en este periodo.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        Ventas del periodo
      </h3>
      <div className="flex flex-col gap-4">
        {ventas.map((venta) => (
          <div
            key={venta.id_pedido}
            className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 dark:border-gray-800"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Pedido #{venta.id_pedido}
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {formatMoney(venta.total)}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {venta.cliente_nombre}
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatDisplayDate(venta.creado_en)}
              </span>
              {venta.pago_folio && (
                <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-green-forest dark:bg-green-950 dark:text-green-400">
                  Folio {venta.pago_folio}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
