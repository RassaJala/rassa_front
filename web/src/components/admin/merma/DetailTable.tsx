import {
  DECISION_DESECHAR,
  DECISION_DONAR,
  DECISION_TIRAR,
  DECISION_VENDER_MAS_BARATO,
  periodLabel,
  WASTE_DETAIL_LIMIT,
} from '@/common/waste';
import type { MermaResumenItem } from '@/common/waste';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';

const variantMap: Record<string, 'success' | 'error' | 'warning'> = {
  [DECISION_DONAR]: 'success',
  [DECISION_DESECHAR]: 'error',
  // Legacy alias for pre-rename records.
  [DECISION_TIRAR]: 'error',
  [DECISION_VENDER_MAS_BARATO]: 'warning',
};

interface DetailTableProps {
  rows: MermaResumenItem[];
  detailLength: number;
  agruparPor: 'mes' | 'semana';
  totalPaginas: number;
  paginaSegura: number;
  onPrev: () => void;
  onNext: () => void;
}

export function DetailTable({
  rows,
  detailLength,
  agruparPor,
  totalPaginas,
  paginaSegura,
  onPrev,
  onNext,
}: DetailTableProps) {
  const mostrarPaginacion = totalPaginas > 1;
  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        Detalle de mermas
      </h3>
      {detailLength >= WASTE_DETAIL_LIMIT && (
        <p className="-mt-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
          Mostrando los primeros {WASTE_DETAIL_LIMIT} registros del detalle.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              {['Período', 'Producto', 'Decisión', 'Cantidad', 'Registros'].map(
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
            {rows.map((item, idx) => (
              <tr
                key={`${item.producto_id}-${item.decision_id}-${item.periodo}-${idx}`}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                  {periodLabel(item.periodo, agruparPor)}
                </td>
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                  {item.producto_nombre}
                </td>
                <td className="py-3 pr-4">
                  <Badge
                    variant={
                      variantMap[item.decision_nombre.toLowerCase().trim()] ??
                      'warning'
                    }
                  >
                    {item.decision_nombre}
                  </Badge>
                </td>
                <td className="py-3 pr-4 font-semibold text-brand-red-coral">
                  {item.total_cantidad}
                </td>
                <td className="py-3 text-gray-600 dark:text-gray-400">
                  {item.total_mermas}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mostrarPaginacion && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Página {paginaSegura} de {totalPaginas}
            {' — '}
            {detailLength} registros en total
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
