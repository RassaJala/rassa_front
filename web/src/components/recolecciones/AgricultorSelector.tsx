import {
  type AgricultorListItem,
  type AgricultorUbicacion,
  getFullNameAgricultor,
} from '../../hooks/useAgricultoresUbicacion';
import { useAppColors } from '../../hooks/useAppColors';
import { recoleccionDuplicateKey } from '../../utils/recolecciones';

interface AgricultorSelectorProps {
  readonly grupos: readonly AgricultorUbicacion[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly truncated: boolean;
  readonly errores: number;
  readonly selectedId: number | null;
  readonly duplicateKeys: ReadonlySet<string>;
  readonly fecha: string;
  readonly onRetry: () => void;
  readonly onSelect: (agricultor: AgricultorListItem) => void;
}

export function AgricultorSelector({
  grupos,
  isLoading,
  isError,
  truncated,
  errores,
  selectedId,
  duplicateKeys,
  fecha,
  onRetry,
  onSelect,
}: AgricultorSelectorProps) {
  const colors = useAppColors();

  return (
    <div
      style={{
        marginTop: 10,
        backgroundColor: colors.surface,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        padding: 12,
      }}
    >
      {truncated || errores > 0 ? (
        <div
          style={{
            padding: '10px',
            borderRadius: 8,
            backgroundColor: colors.accentBg,
          }}
        >
          <div
            style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}
          >
            {truncated && errores > 0
              ? 'Solo se muestran los primeros agricultores y algunos no se pudieron cargar.'
              : truncated
                ? 'Solo se muestran los primeros agricultores.'
                : 'Algunos agricultores no se pudieron cargar.'}
          </div>
          <button
            type="button"
            onClick={onRetry}
            style={{
              marginTop: 6,
              background: 'none',
              border: 'none',
              color: colors.brand,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'block',
              marginInline: 'auto',
            }}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-red-coral" />
        </div>
      ) : null}

      {!isLoading && isError ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: colors.muted }}>
            Error al cargar agricultores.
          </div>
          <button
            type="button"
            onClick={onRetry}
            style={{
              marginTop: 12,
              background: 'none',
              border: 'none',
              color: colors.brand,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && grupos.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: colors.muted }}>
            No se encontraron agricultores.
          </div>
        </div>
      ) : null}

      {!isLoading && !isError && grupos.length > 0 ? (
        <>
          {grupos.map((municipio, idxM) => (
            <div
              key={`${municipio.municipioNombre}-${idxM}`}
              style={{ marginBottom: 6 }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: colors.brand,
                  marginTop: 8,
                }}
              >
                {municipio.municipioNombre}
              </div>
              {municipio.localidades.map((localidad, idxL) => (
                <div
                  key={`${localidad.localidadNombre}-${idxL}`}
                  style={{ marginLeft: 8 }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: colors.muted,
                      marginTop: 6,
                    }}
                  >
                    {localidad.localidadNombre}
                  </div>
                  {localidad.agricultores.map((a) => (
                    <AgricultorRow
                      key={a.id_usuario}
                      agricultor={a}
                      selectedId={selectedId}
                      duplicateKeys={duplicateKeys}
                      fecha={fecha}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

function AgricultorRow({
  agricultor,
  selectedId,
  duplicateKeys,
  fecha,
  onSelect,
}: {
  readonly agricultor: AgricultorListItem;
  readonly selectedId: number | null;
  readonly duplicateKeys: ReadonlySet<string>;
  readonly fecha: string;
  readonly onSelect: (agricultor: AgricultorListItem) => void;
}) {
  const colors = useAppColors();
  const selected = selectedId === agricultor.id_usuario;
  const duplicado = duplicateKeys.has(
    recoleccionDuplicateKey(agricultor.id_usuario, fecha),
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(agricultor)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        width: '100%',
        backgroundColor: selected ? colors.accentBg : 'transparent',
        borderRadius: 8,
        padding: '9px 10px',
        marginTop: 4,
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: selected ? 700 : 500,
          color: colors.fg,
          flexShrink: 1,
        }}
      >
        {getFullNameAgricultor(agricultor)}
      </span>
      {duplicado ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: colors.coral,
            flexShrink: 0,
          }}
        >
          Ya tiene recolección
        </span>
      ) : null}
    </button>
  );
}
