import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import {
  buildDescription,
  DOT_SIZE,
  formatTimestamp,
  getStatusColor,
  isNotFoundError,
  normalizeOrderHistoryResponse,
  STALE_TIME,
  STATUS_LABELS,
} from '../constants/orderTimeline';
import api from '../services/api';
import { useAppColors } from '../hooks/useAppColors';
import type { OrderStatusHistory } from '../types';

// ponytail: module-scoped styles to avoid recreation on every render
const SPIN_KEYFRAMES = `@keyframes spin { to { transform: rotate(360deg) } }`;

const btnStyle: React.CSSProperties = {
  height: 40,
  padding: '0 18px',
  borderRadius: 10,
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const lineStyle: React.CSSProperties = {
  width: 2,
  flex: 1,
  minHeight: 24,
};

const centeredStyle: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  padding: '64px 24px',
};

const timelineEntryStyle: React.CSSProperties = {
  display: 'flex',
  gap: 14,
  minHeight: 64,
};

export function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fg, muted, border, surface, brand } = useAppColors();
  const orderId = Number(id);
  const isValidId = !isNaN(orderId) && orderId > 0;

  const { data, isLoading, isError, error, refetch } = useQuery<
    OrderStatusHistory[],
    Error
  >({
    queryKey: ['order-history', orderId] as const,
    queryFn: async () => {
      const res = await api.get<{ data: OrderStatusHistory[] }>(
          `/pedidos/${orderId}/historial`,
        );
      return normalizeOrderHistoryResponse(res.data);
    },
    enabled: isValidId,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: true,
    // axios-retry (web api.ts:19-30) ya aplica 3 reintentos con exponentialDelay
    // a GET sobre errores de red o 5xx. `retry: false` evita doble reintento.
    retry: false,
  });

  const entries = data ?? [];

  if (!isValidId) {
    return (
      <div>
        <p style={{ color: muted }}>ID de pedido inválido</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            ...btnStyle,
            background: surface,
            border: `1.5px solid ${border}`,
            color: fg,
            fontSize: 18,
            padding: '0 10px',
          }}
        >
          ←
        </button>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: fg,
          }}
        >
          Pedido #{orderId}
        </h2>
      </div>

      {/* Content */}
      <div
        style={{
          background: surface,
          borderRadius: 16,
          border: `1px solid ${border}`,
          overflow: 'hidden',
        }}
      >
        {/* Loading */}
        {isLoading && (
          <div style={centeredStyle}>
            <div
              style={{
                width: 32,
                height: 32,
                border: '3px solid',
                borderColor: `${border} ${border} ${border} ${brand}`,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ marginTop: 12, fontSize: 14, color: muted }}>
              Cargando historial…
            </p>
            <style>{SPIN_KEYFRAMES}</style>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div style={{ ...centeredStyle, color: muted }}>
            <span style={{ fontSize: 40 }}>⚠️</span>
            <p style={{ marginTop: 12, fontSize: 14, textAlign: 'center' }}>
              {isNotFoundError(error)
                ? 'Pedido no encontrado'
                : 'Error al cargar el historial'}
            </p>
            {isNotFoundError(error) ? (
              <button
                onClick={() => navigate(-1)}
                style={{
                  ...btnStyle,
                  marginTop: 16,
                  background: surface,
                  border: `1.5px solid ${border}`,
                  color: brand,
                }}
              >
                ← Volver
              </button>
            ) : (
              <button
                onClick={() => void refetch()}
                style={{
                  ...btnStyle,
                  marginTop: 16,
                  background: surface,
                  border: `1.5px solid ${border}`,
                  color: brand,
                }}
              >
                🔄 Reintentar
              </button>
            )}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && entries.length === 0 && (
          <div style={{ ...centeredStyle, color: muted }}>
            <span style={{ fontSize: 40 }}>📋</span>
            <p style={{ marginTop: 12, fontSize: 14 }}>
              Sin historial de cambios
            </p>
          </div>
        )}

        {/* Timeline */}
        {!isLoading && !isError && entries.length > 0 && (
          <div style={{ padding: 24 }}>
            {entries.map((entry, index) => {
              const isLast = index === entries.length - 1;
              const dotColor = getStatusColor(entry.estado_nuevo, border);
              const label =
                STATUS_LABELS[entry.estado_nuevo] ?? entry.estado_nuevo;
              const description = buildDescription(entry);

              return (
                <div key={entry.id_historial} style={timelineEntryStyle}>
                  {/* Gutter */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: 16,
                    }}
                  >
                    <div
                      style={{
                        width: DOT_SIZE,
                        height: DOT_SIZE,
                        borderRadius: '50%',
                        backgroundColor: dotColor,
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    />
                    {!isLast && (
                      <div
                        style={{
                          ...lineStyle,
                          backgroundColor: border,
                        }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    style={{
                      flex: 1,
                      paddingBottom: isLast ? 0 : 20,
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, color: fg }}>
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: muted,
                        marginTop: 2,
                      }}
                    >
                      {description}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 4,
                        fontSize: 12,
                        color: muted,
                      }}
                    >
                      <span>🕐</span>
                      <span>{formatTimestamp(entry.creado_en)}</span>
                      {entry.cambiado_por_nombre !== null && (
                        <>
                          <span>·</span>
                          <span>👤 {entry.cambiado_por_nombre}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
