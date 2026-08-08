import { ESTADO_PAGADA, ESTADO_PENDIENTE } from '@/common/settlements';
import type { SettlementEstado } from '@/common/settlements';
import { getFullName } from '@/components/admin-users/types';
import type { User } from '@/components/admin-users/types';
import { Card } from '@/components/ui/Card';

const ESTADO_FILTERS: readonly {
  label: string;
  value: SettlementEstado | '';
}[] = [
  { label: 'Todas', value: '' },
  { label: 'Pendientes', value: ESTADO_PENDIENTE },
  { label: 'Pagadas', value: ESTADO_PAGADA },
];

const inputClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-green-forest focus:ring-1 focus:ring-brand-green-forest dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

const labelClass =
  'text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400';

interface SettlementFilterBarProps {
  selectedEstado: SettlementEstado | '';
  farmerId: number | undefined;
  farmers: User[];
  fechaDesde: string;
  fechaHasta: string;
  hasFilters: boolean;
  isDateRangeInvalid: boolean;
  today: string;
  onEstadoChange: (v: SettlementEstado | '') => void;
  onFarmerChange: (v: number | undefined) => void;
  onFechaDesdeChange: (v: string) => void;
  onFechaHastaChange: (v: string) => void;
  onReset: () => void;
}

export function SettlementFilterBar({
  selectedEstado,
  farmerId,
  farmers,
  fechaDesde,
  fechaHasta,
  hasFilters,
  isDateRangeInvalid,
  today,
  onEstadoChange,
  onFarmerChange,
  onFechaDesdeChange,
  onFechaHastaChange,
  onReset,
}: SettlementFilterBarProps) {
  return (
    <Card className="mb-6">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-wrap items-end gap-4"
      >
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Estado</label>
          <div className="flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
            {ESTADO_FILTERS.map((opt) => {
              const isSelected = opt.value === selectedEstado;
              return (
                <button
                  key={opt.value || 'todas'}
                  type="button"
                  onClick={() => onEstadoChange(opt.value)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-brand-green-forest text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Agricultor</label>
          <select
            value={farmerId ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              const id = Number(raw);
              onFarmerChange(raw === '' || Number.isNaN(id) ? undefined : id);
            }}
            aria-label="Agricultor"
            className={inputClass}
          >
            <option value="">Todos los agricultores</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>
                {getFullName(f)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Desde</label>
          <input
            type="date"
            max={today}
            value={fechaDesde}
            onChange={(e) => onFechaDesdeChange(e.target.value)}
            aria-label="Fecha desde"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Hasta</label>
          <input
            type="date"
            max={today}
            value={fechaHasta}
            onChange={(e) => onFechaHastaChange(e.target.value)}
            aria-label="Fecha hasta"
            className={inputClass}
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Limpiar filtros
          </button>
        )}
      </form>

      {isDateRangeInvalid && (
        <p className="mt-3 text-xs font-medium text-red-500 dark:text-red-400">
          La fecha «Hasta» debe ser mayor o igual a «Desde».
        </p>
      )}
    </Card>
  );
}
