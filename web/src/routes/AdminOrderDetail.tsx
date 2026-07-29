import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import api from '../services/api';
import { useAppColors } from '../hooks/useAppColors';

interface HistoryEntry {
  readonly id_historial: number;
  readonly estado_anterior: string | null;
  readonly estado_nuevo: string;
  readonly creado_en: string;
  readonly cambiado_por_nombre: string | null;
}

import {
  formatTimestamp,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../constants/orderTimeline';
import type { ApiResponse } from '../types';

export function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const colors = useAppColors();
  const { fg, muted, border, surface, brand } = colors;
  const orderId = Number(id);

  const { data, isLoading, isError, error, refetch } = useQuery<HistoryEntry[]>(
    {
      queryKey: ['order-history', orderId],
      queryFn: async () => {
        const res = await api.get<ApiResponse<HistoryEntry[]> | HistoryEntry[]>(
          `/pedidos/${orderId}/historial`,
        );
        if (Array.isArray(res.data)) return res.data;
        return (res.data as ApiResponse<HistoryEntry[]>).data;
      },
      enabled: orderId > 0,
      retry: false,
    },
  );

  const entries = data ?? [];

  // ── Styles ──

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

  const dotStyle = (color: string): React.CSSProperties => ({
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: color,
    flexShrink: 0,
    marginTop: 4,
  });

  const lineStyle: React.CSSProperties = {
    width: 2,
    flex: 1,
    backgroundColor: border,
    minHeight: 24,
  };

  // ── Render ──

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
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              padding: '64px 24px',
              color: muted,
            }}
          >
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
            <p style={{ marginTop: 12, fontSize: 14 }}>Cargando historial…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              padding: '64px 24px',
              color: muted,
            }}
          >
            <span style={{ fontSize: 40 }}>⚠️</span>
            <p style={{ marginTop: 12, fontSize: 14, textAlign: 'center' }}>
              {error instanceof Error
                ? error.message
                : 'Error al cargar el historial'}
            </p>
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
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && entries.length === 0 && (
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              padding: '64px 24px',
              color: muted,
            }}
          >
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
              const dotColor = STATUS_COLORS[entry.estado_nuevo] ?? border;
              const label =
                STATUS_LABELS[entry.estado_nuevo] ?? entry.estado_nuevo;
              const description =
                entry.estado_anterior === null
                  ? 'Pedido creado'
                  : `${STATUS_LABELS[entry.estado_anterior] ?? entry.estado_anterior} → ${label}`;

              return (
                <div
                  key={entry.id_historial}
                  style={{ display: 'flex', gap: 14, minHeight: 64 }}
                >
                  {/* Gutter */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: 16,
                    }}
                  >
                    <div style={dotStyle(dotColor)} />
                    {!isLast && <div style={lineStyle} />}
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
