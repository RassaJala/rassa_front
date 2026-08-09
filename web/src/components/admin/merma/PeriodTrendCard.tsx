import { WASTE_DETAIL_LIMIT } from '@/common/waste';
import { Card } from '../../ui/Card';

export interface TrendItem {
  nombre: string;
  total: number;
}

interface PeriodTrendCardProps {
  agruparPor: 'mes' | 'semana';
  data: TrendItem[];
  maxTotal: number;
  selectedProductName?: string;
  isSingleProduct: boolean;
  truncated: boolean;
}

export function PeriodTrendCard({
  agruparPor,
  data,
  maxTotal,
  selectedProductName,
  isSingleProduct,
  truncated,
}: PeriodTrendCardProps) {
  return (
    <Card className="lg:col-span-2">
      <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
        Evolución por {agruparPor === 'mes' ? 'mes' : 'semana'}
      </h3>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Cada barra = total de unidades mermadas en ese período
        {isSingleProduct && (
          <>
            {' '}
            para <span className="font-semibold">{selectedProductName}</span>
          </>
        )}
      </p>
      {truncated && (
        <p className="mb-4 text-xs italic text-gray-400 dark:text-gray-500">
          Basado en los primeros {WASTE_DETAIL_LIMIT} registros.
        </p>
      )}
      {data.length > 0 ? (
        <div className="flex h-[180px] items-end gap-1.5">
          {data.map((item) => {
            const pct = (item.total / maxTotal) * 100;
            return (
              <div
                key={item.nombre}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span className="text-[11px] font-bold tabular-nums text-gray-600 dark:text-gray-400">
                  {item.total}
                </span>
                <div
                  className="w-full max-w-[32px] rounded-t-sm bg-brand-green-forest/80 dark:bg-brand-green-forest/70"
                  style={{ height: `${Math.max(pct, 4)}%`, minHeight: 6 }}
                />
                <span className="text-center text-[10px] font-medium uppercase tracking-tight text-gray-500 dark:text-gray-400">
                  {item.nombre}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No hay suficientes datos para mostrar tendencia.
        </p>
      )}
    </Card>
  );
}
