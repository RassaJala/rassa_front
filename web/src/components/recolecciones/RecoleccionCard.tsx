import { CheckCircle2, MessageSquare, Truck, X } from 'lucide-react';

import {
  ESTADO_COLORS,
  ESTADO_LABELS,
  TRANSICIONES,
} from '../../constants/recolecciones';
import { useAppColors } from '../../hooks/useAppColors';
import type { Recoleccion, RecoleccionEstado } from '../../types/recolecciones';
import { formatHora } from '../../utils/recolecciones';

interface RecoleccionCardProps {
  readonly item: Recoleccion;
  readonly busy: boolean;
  readonly canContact: boolean;
  readonly onTransition: (estado: RecoleccionEstado) => void;
  readonly onCancel: () => void;
  readonly onContact: () => void;
}

export function RecoleccionCard({
  item,
  busy,
  canContact,
  onTransition,
  onCancel,
  onContact,
}: RecoleccionCardProps) {
  const colors = useAppColors();
  // Fallbacks defensivos: un `estado` fuera del enum (dato corrupto o un valor
  // futuro del backend) no debe tumbar la página completa con un TypeError.
  const badge = ESTADO_COLORS[item.estado] ?? ESTADO_COLORS.pendiente;
  const estadoLabel = ESTADO_LABELS[item.estado] ?? item.estado;
  const transiciones = TRANSICIONES[item.estado] ?? [];

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        border: `1px solid ${colors.border}`,
        padding: 16,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.fg }}>
            {item.agricultor_nombre ?? 'Agricultor'}
          </div>
          <div style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
            {item.hora_inicio
              ? `${formatHora(item.hora_inicio)} h${
                  item.hora_fin ? ` – ${formatHora(item.hora_fin)} h` : ''
                }`
              : 'Sin hora definida'}
          </div>
        </div>
        <div
          style={{
            backgroundColor: badge.bg,
            borderRadius: 8,
            padding: '4px 10px',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: badge.fg }}>
            {estadoLabel}
          </span>
        </div>
      </div>

      {item.comentarios ? (
        <div
          style={{
            fontSize: 13,
            color: colors.muted,
            marginTop: 10,
            fontStyle: 'italic',
          }}
        >
          {item.comentarios}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {canContact ? (
          <ActionButton
            icon={<MessageSquare size={16} color="#fff" />}
            label="Contactar"
            onClick={onContact}
            disabled={busy}
            background={colors.brand}
          />
        ) : null}

        {transiciones.includes('recolectado') ? (
          <ActionButton
            icon={<CheckCircle2 size={16} color="#fff" />}
            label="Recolectado"
            onClick={() => onTransition('recolectado')}
            disabled={busy}
            background={ESTADO_COLORS.recolectado.fg}
          />
        ) : null}

        {transiciones.includes('en_ruta') ? (
          <ActionButton
            icon={<Truck size={16} color="#fff" />}
            label="Iniciar ruta"
            onClick={() => onTransition('en_ruta')}
            disabled={busy}
            background={colors.brand}
          />
        ) : null}

        {transiciones.includes('cancelado') ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRadius: 10,
              border: `1px solid ${colors.coral}`,
              padding: '10px 14px',
              color: colors.coral,
              fontSize: 13,
              fontWeight: 600,
              background: 'transparent',
              cursor: 'pointer',
              opacity: busy ? 0.5 : 1,
            }}
          >
            <X size={16} />
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  background,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled: boolean;
  readonly background: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 10,
        backgroundColor: background,
        padding: '10px 12px',
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
