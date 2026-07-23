import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppColors } from '../hooks/useAppColors';

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const weekSales = [90, 130, 70, 150, 110, 60, 40];

export function AdminDashboard() {
  const colors = useAppColors();
  const { isDark, fg, muted, border, surface, brand, coral, bg } = colors;
  const navigate = useNavigate();
  const [lookupId, setLookupId] = useState('');

  const days = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ];
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  const d = new Date();
  const today = `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;

  const stats = [
    {
      icon: '💰',
      value: '$12,450',
      label: 'Ventas de hoy',
      change: '↑ 12%',
      color: brand,
    },
    {
      icon: '📦',
      value: '8',
      label: 'Pedidos activos',
      change: '↑ 3',
      color: coral,
    },
    {
      icon: '👨‍🌾',
      value: '24',
      label: 'Productores',
      change: '↑ 2',
      color: '#F2A900',
    },
    {
      icon: '📈',
      value: '$98,300',
      label: 'Ingresos del mes',
      change: '↑ 8%',
      color: '#4A8E68',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: fg,
          }}
        >
          Buenos días, Admin
        </h2>
        <p
          style={{
            fontSize: 13,
            color: muted,
            marginTop: 2,
            letterSpacing: '0.02em',
          }}
        >
          {today}
        </p>
      </div>

      {/* Order lookup */}
      <div
        style={{
          background: surface,
          borderRadius: 16,
          border: `1px solid ${border}`,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: fg }}>
          📦 Ver historial de pedido
        </span>
        <input
          type="number"
          placeholder="ID del pedido"
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          style={{
            height: 40,
            border: `1.5px solid ${border}`,
            borderRadius: 10,
            padding: '0 14px',
            fontSize: 15,
            fontFamily: 'inherit',
            background: bg,
            color: fg,
            outline: 'none',
            width: 160,
          }}
        />
        <button
          onClick={() => {
            const id = Number.parseInt(lookupId, 10);
            if (id > 0) navigate(`/admin/pedidos/${id}`);
          }}
          disabled={!lookupId || Number(lookupId) <= 0}
          style={{
            height: 40,
            padding: '0 18px',
            borderRadius: 10,
            border: 'none',
            background: brand,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: lookupId && Number(lookupId) > 0 ? 'pointer' : 'not-allowed',
            opacity: lookupId && Number(lookupId) > 0 ? 1 : 0.5,
          }}
        >
          Ver historial
        </button>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {stats.map((s, i) => (
          <div
            key={i}
            style={{
              background: surface,
              borderRadius: 16,
              padding: '20px 22px',
              border: `1px solid ${border}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: isDark
                    ? 'rgba(74,138,99,0.15)'
                    : 'rgba(36,86,60,0.07)',
                  color: brand,
                }}
              >
                {s.change}
              </span>
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: s.color,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 12,
                color: muted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Table row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 28,
        }}
      >
        {/* Bar chart */}
        <div
          style={{
            background: surface,
            borderRadius: 16,
            padding: '20px 22px',
            border: `1px solid ${border}`,
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 16,
              letterSpacing: '-0.01em',
              color: fg,
            }}
          >
            Ventas de la semana
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 12,
              height: 160,
              paddingTop: 8,
            }}
          >
            {weekSales.map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: 52,
                    borderRadius: '8px 8px 0 0',
                    height: h,
                    background: i === 3 ? coral : brand,
                    minHeight: 8,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: muted,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  {weekDays[i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div
          style={{
            background: surface,
            borderRadius: 16,
            padding: '20px 22px',
            border: `1px solid ${border}`,
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 16,
              letterSpacing: '-0.01em',
              color: fg,
            }}
          >
            Productos más vendidos
          </h3>
          <div>
            {[
              { name: '🥑 Aguacate Hass', sales: '$4,200' },
              { name: '🍅 Tomate orgánico', sales: '$3,150' },
              { name: '🌿 Café especial', sales: '$2,880' },
              { name: '🧅 Cebolla larga', sales: '$1,940' },
              { name: '🌽 Maíz criollo', sales: '$1,620' },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: i < 4 ? `1px solid ${border}` : 'none',
                }}
              >
                <span style={{ fontSize: 14, color: fg }}>{p.name}</span>
                <span style={{ fontWeight: 600, color: brand }}>{p.sales}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity table */}
      <div
        style={{
          background: surface,
          borderRadius: 16,
          padding: '20px 22px',
          border: `1px solid ${border}`,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 16,
            letterSpacing: '-0.01em',
            color: fg,
          }}
        >
          Actividad reciente
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Pedido', 'Productor', 'Producto', 'Monto', 'Estado'].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        fontSize: 11,
                        color: muted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontWeight: 600,
                        padding: '0 0 10px',
                        borderBottom: `1px solid ${border}`,
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  id: '#2841',
                  producer: 'Don Carlos',
                  avatar: 'DC',
                  product: 'Aguacates Hass · 12 kg',
                  amount: '$1,280',
                  status: 'Entregado',
                  color: brand,
                },
                {
                  id: '#2840',
                  producer: 'María G.',
                  avatar: 'MG',
                  product: 'Tomates orgánicos · 8 kg',
                  amount: '$960',
                  status: 'En camino',
                  color: '#F2A900',
                },
                {
                  id: '#2839',
                  producer: 'Finca El Paraíso',
                  avatar: 'EP',
                  product: 'Café especial · 5 kg',
                  amount: '$2,450',
                  status: 'Entregado',
                  color: brand,
                },
                {
                  id: '#2838',
                  producer: 'La Rinconada',
                  avatar: 'LR',
                  product: 'Cebolla larga · 15 kg',
                  amount: '$890',
                  status: 'Entregado',
                  color: brand,
                },
                {
                  id: '#2837',
                  producer: 'José V.',
                  avatar: 'JV',
                  product: 'Maíz criollo · 20 kg',
                  amount: '$1,100',
                  status: 'Preparando',
                  color: '#F2A900',
                },
              ].map((row, i) => (
                <tr key={i}>
                  <td
                    style={{
                      padding: '12px 0',
                      fontSize: 14,
                      fontWeight: 600,
                      color: fg,
                      borderBottom: `1px solid ${border}`,
                    }}
                  >
                    {row.id}
                  </td>
                  <td
                    style={{
                      padding: '12px 0',
                      fontSize: 14,
                      borderBottom: `1px solid ${border}`,
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 13,
                          fontWeight: 600,
                          background: isDark ? '#1C2D22' : '#E2F0E6',
                          color: brand,
                        }}
                      >
                        {row.avatar}
                      </span>
                      <span style={{ color: fg }}>{row.producer}</span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '12px 0',
                      fontSize: 13,
                      color: muted,
                      borderBottom: `1px solid ${border}`,
                    }}
                  >
                    {row.product}
                  </td>
                  <td
                    style={{
                      padding: '12px 0',
                      fontSize: 14,
                      fontWeight: 600,
                      color: brand,
                      borderBottom: `1px solid ${border}`,
                    }}
                  >
                    {row.amount}
                  </td>
                  <td
                    style={{
                      padding: '12px 0',
                      borderBottom: `1px solid ${border}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: 6,
                        background: isDark
                          ? 'rgba(74,138,99,0.15)'
                          : 'rgba(36,86,60,0.07)',
                        color: row.color,
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
