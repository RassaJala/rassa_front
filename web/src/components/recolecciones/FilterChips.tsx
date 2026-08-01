import { FILTROS } from '../../constants/recolecciones';
import { useAppColors } from '../../hooks/useAppColors';
import type { RecoleccionEstado } from '../../types/recolecciones';

interface FilterChipsProps {
  readonly filter: RecoleccionEstado | '';
  readonly onSelect: (value: RecoleccionEstado | '') => void;
}

export function FilterChips({ filter, onSelect }: FilterChipsProps) {
  const colors = useAppColors();

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {FILTROS.map((e) => {
        const selected = filter === e.value;
        return (
          <button
            key={e.value}
            type="button"
            onClick={() => onSelect(e.value)}
            style={{
              padding: '7px 14px',
              borderRadius: 20,
              backgroundColor: selected ? colors.brand : 'transparent',
              border: `1.5px solid ${selected ? colors.brand : colors.border}`,
              color: selected ? '#fff' : colors.fg,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {e.label}
          </button>
        );
      })}
    </div>
  );
}
