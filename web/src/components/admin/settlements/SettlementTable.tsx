import { Link } from 'react-router-dom';

import type { Settlement } from '@/common/settlements';
import { formatDisplayDate } from '@/common/waste';
import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/utils/money';

import { SettlementEstadoBadge } from './SettlementEstadoBadge';

interface SettlementTableProps {
  rows: Settlement[];
  total: number;
  totalPaginas: number;
  paginaSegura: number;
  onPrev: () => void;
  onNext: () => void;
}

export function SettlementTable({
  rows,
  total,
  totalPaginas,
  paginaSegura,
  onPrev,
  onNext,
}: SettlementTableProps) {
  const mostrarPaginacion = totalPaginas > 1;
  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        Liquidaciones
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              {['Agricultor', 'Período', 'Ventas', 'A liquidar', 'Estado'].map(
                (h) => (
                  <th
                    key={h}
                    className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id_liquidacion}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                  <Link
                    to={`/admin/liquidaciones/${s.id_liquidacion}`}
                    className="transition-colors hover:text-brand-green-forest hover:underline"
                  >
                    {s.agricultor_nombre}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                  {formatDisplayDate(s.periodo_inicio)} —{' '}
                  {formatDisplayDate(s.periodo_fin)}
                </td>
                <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                  {formatMoney(s.monto_ventas)}
                </td>
                <td className="py-3 pr-4 font-semibold text-brand-green-forest">
                  {formatMoney(s.monto_liquidar)}
                </td>
                <td className="py-3">
                  <SettlementEstadoBadge estado={s.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mostrarPaginacion && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Página {paginaSegura} de {totalPaginas} — {total} liquidaciones en
            total
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={paginaSegura <= 1}
              onClick={onPrev}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Anterior
            </button>

            <button
              type="button"
              disabled={paginaSegura >= totalPaginas}
              onClick={onNext}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
