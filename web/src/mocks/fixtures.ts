import type { TipoPago } from '@/common/payments';
import type { Settlement, SettlementDetail } from '@/common/settlements';
import type { Pedido } from '../services/orderTypes';

// Single source of truth for the settlements msw fixtures — shared by
// mocks/handlers.ts and the settlements integration tests.

// S-6: single source of truth for the POST /pedidos/ success fixture (order
// #45) — shared by mocks/handlers.ts, services/orders.test.ts and the checkout
// integration tests. A change to the wire contract must be made here only.
export const PEDIDO_45: Pedido = {
  id_pedido: 45,
  cliente_nombre: 'Cliente Demo',
  estado: 'pendiente',
  subtotal: '25.00',
  iva: '5.25',
  total: '30.25',
  detalles: [],
  creado_en: '2026-07-31T13:00:00Z',
};

export const FARMERS_RAW = [
  {
    id_usuario: 1,
    email: 'juan@correo.com',
    role: 'farmer',
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: 'Gómez',
    localidad: null,
    localidad_nombre: null,
    estado: true,
    creado_en: '2026-01-01T09:00:00-03:00',
  },
  {
    id_usuario: 2,
    email: 'maria@correo.com',
    role: 'farmer',
    nombre: 'María',
    apellido_paterno: 'López',
    apellido_materno: 'Díaz',
    localidad: null,
    localidad_nombre: null,
    estado: true,
    creado_en: '2026-01-02T09:00:00-03:00',
  },
];

function makeSettlement(
  id: number,
  agricultorId: number,
  agricultorNombre: string,
  periodoInicio: string,
  periodoFin: string,
  estado: Settlement['estado'],
  montoVentas: string,
): Settlement {
  const ventas = Number.parseFloat(montoVentas);
  const comision = Number.parseFloat((ventas * 0.1).toFixed(2));
  return {
    id_liquidacion: id,
    agricultor_id: agricultorId,
    agricultor_nombre: agricultorNombre,
    periodo_inicio: periodoInicio,
    periodo_fin: periodoFin,
    monto_ventas: montoVentas,
    comision: comision.toFixed(2),
    monto_liquidar: (ventas - comision).toFixed(2),
    tasa_comision: '0.10',
    estado,
    creado_en: '2026-08-01T10:00:00-03:00',
  };
}

// 12 items so the client-side pagination slice (PAGE_SIZE = 10) shows two pages.
export const LIQUIDACIONES: Settlement[] = [
  // July — pendiente (farmer 1, ids 1–6)
  makeSettlement(
    1,
    1,
    'Juan Pérez',
    '2026-07-01',
    '2026-07-31',
    'pendiente',
    '1000.00',
  ),
  makeSettlement(
    2,
    1,
    'Juan Pérez',
    '2026-07-01',
    '2026-07-31',
    'pendiente',
    '1100.00',
  ),
  makeSettlement(
    3,
    1,
    'Juan Pérez',
    '2026-07-01',
    '2026-07-31',
    'pendiente',
    '1200.00',
  ),
  makeSettlement(
    4,
    1,
    'Juan Pérez',
    '2026-07-01',
    '2026-07-31',
    'pendiente',
    '1300.00',
  ),
  makeSettlement(
    5,
    1,
    'Juan Pérez',
    '2026-07-01',
    '2026-07-31',
    'pendiente',
    '1400.00',
  ),
  makeSettlement(
    6,
    1,
    'Juan Pérez',
    '2026-07-01',
    '2026-07-31',
    'pendiente',
    '1500.00',
  ),
  // July — pendiente (farmer 2, ids 7–10)
  makeSettlement(
    7,
    2,
    'María López',
    '2026-07-01',
    '2026-07-31',
    'pendiente',
    '2000.00',
  ),
  makeSettlement(
    8,
    2,
    'María López',
    '2026-07-01',
    '2026-07-31',
    'pendiente',
    '2100.00',
  ),
  makeSettlement(
    9,
    2,
    'María López',
    '2026-07-01',
    '2026-07-31',
    'pendiente',
    '2200.00',
  ),
  makeSettlement(
    10,
    2,
    'María López',
    '2026-07-01',
    '2026-07-31',
    'pendiente',
    '2300.00',
  ),
  // June — pagada (ids 11–12)
  makeSettlement(
    11,
    1,
    'Juan Pérez',
    '2026-06-01',
    '2026-06-30',
    'pagada',
    '500.00',
  ),
  makeSettlement(
    12,
    2,
    'María López',
    '2026-06-01',
    '2026-06-30',
    'pagada',
    '800.00',
  ),
];

const detailBase = {
  agricultor_id: 1,
  agricultor_nombre: 'Juan Pérez',
  periodo_inicio: '2026-07-01',
  periodo_fin: '2026-07-31',
  comision: '100.00',
  tasa_comision: '0.10',
  creado_en: '2026-08-01T10:00:00-03:00',
};

export const LIQUIDACION_DETAIL_PENDIENTE: SettlementDetail = {
  ...detailBase,
  id_liquidacion: 1,
  monto_ventas: '1000.00',
  monto_liquidar: '900.00',
  estado: 'pendiente',
  ventas: [
    {
      id_pedido: 5,
      cliente_nombre: 'Ana Gómez',
      total: '500.00',
      creado_en: '2026-07-15T12:00:00-03:00',
      pago_folio: null,
    },
    {
      id_pedido: 6,
      cliente_nombre: 'Carlos Ruiz',
      total: '500.00',
      creado_en: '2026-07-20T12:00:00-03:00',
      pago_folio: 'P-2026-0001',
    },
  ],
  pago_liquidacion: null,
};

export const LIQUIDACION_DETAIL_PAGADA: SettlementDetail = {
  ...detailBase,
  id_liquidacion: 11,
  monto_ventas: '500.00',
  // Overrides detailBase comision so the fixture is internally consistent:
  // 500.00 × tasa 0.10 = 50.00, and 500.00 − 50.00 = monto_liquidar 450.00.
  // A contradictory comision here would make the breakdown label (rate from
  // tasa_comision) disagree with the shown amount (server comision).
  comision: '50.00',
  monto_liquidar: '450.00',
  estado: 'pagada',
  ventas: [
    {
      id_pedido: 2,
      cliente_nombre: 'Ana Gómez',
      total: '500.00',
      creado_en: '2026-06-10T12:00:00-03:00',
      pago_folio: 'P-2026-0002',
    },
  ],
  pago_liquidacion: {
    id_pago: 3,
    folio: 'LQ-2026-0011',
    tipo_pago_nombre: 'Transferencia',
    monto: '450.00',
    referencia: 'REF-2026-011',
    fecha_pago: '2026-07-02T11:00:00-03:00',
  },
};

export const TIPOS_PAGO: TipoPago[] = [
  { id_tipo_pago: 1, nombre: 'Efectivo' },
  { id_tipo_pago: 2, nombre: 'Transferencia' },
  { id_tipo_pago: 3, nombre: 'Depósito' },
];

// Build the marcar-pagada success response for the REQUESTED id (CRIT-1): the
// paid detail must echo the SAME liquidación the user paid. The old fixture
// hardcoded id 11, so a payment on id 1 flipped the screen to "Liquidación #11"
// after setQueryData. The msw handler reads the id from the request path and
// calls this helper.
export function marcarPagadaResponse(id: number): {
  ok: true;
  data: SettlementDetail;
  message: string;
} {
  // R3-002: echo the requested liquidación's OWN amounts from the list
  // fixture — paying id 2 must return a pago of $990.00, not the hardcoded
  // $900.00 of id 1. Fall back to the pendiente detail base when the id is not
  // in the list.
  const source = LIQUIDACIONES.find((l) => l.id_liquidacion === id);
  return {
    ok: true,
    data: {
      ...LIQUIDACION_DETAIL_PENDIENTE,
      id_liquidacion: id,
      monto_ventas:
        source?.monto_ventas ?? LIQUIDACION_DETAIL_PENDIENTE.monto_ventas,
      comision: source?.comision ?? LIQUIDACION_DETAIL_PENDIENTE.comision,
      monto_liquidar:
        source?.monto_liquidar ?? LIQUIDACION_DETAIL_PENDIENTE.monto_liquidar,
      estado: 'pagada',
      pago_liquidacion: {
        id_pago: 1,
        folio: `LQ-2026-${String(id).padStart(4, '0')}`,
        tipo_pago_nombre: 'Efectivo',
        monto:
          source?.monto_liquidar ?? LIQUIDACION_DETAIL_PENDIENTE.monto_liquidar,
        referencia: 'REF-2026-001',
        fecha_pago: '2026-08-02T10:00:00-03:00',
      },
    },
    message: 'Liquidación marcada como pagada',
  };
}

export const MARCAR_PAGADA_SUCCESS_RESPONSE = marcarPagadaResponse(1);

// R4: idempotent already-paid response (HTTP 200) — named fixture so the
// scenario is explicit in handlers and tests.
export const YA_PAGADA_RESPONSE = {
  ok: true,
  data: LIQUIDACION_DETAIL_PAGADA,
  message: 'La liquidación ya había sido pagada',
};
