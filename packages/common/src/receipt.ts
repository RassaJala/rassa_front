import { formatearFecha } from './dates';
import { calcularSubtotal, formatearMonto } from './payments';
import type { PaymentDetail } from './payments';

const BRAND = '#24563C';
const BRAND_DARK = '#1B402E';
const CORAL = '#DE393A';
const INK = '#2D3328';
const MUTED = '#5E6B5E';
const BORDER = '#E2E6DF';

/** Umbral (en pesos) bajo el cual un ajuste o discrepancia se ignora. */
const EPSILON = 0.005;

/**
 * Subtotal del recibo: la suma de las filas de producto VISIBLES. Es la única
 * fuente de verdad del subtotal y coincide con el que muestran las pantallas
 * (web y mobile), de modo que documento y pantalla nunca se contradicen.
 * total_pedido del backend solo se despliega como fila informativa cuando no
 * cuadra con la suma (ver buildReceiptHtml).
 */
export function calcularSubtotalVisible(pago: PaymentDetail): number {
  return calcularSubtotal(pago.productos ?? []);
}

/**
 * Diferencia entre lo cobrado (monto) y el subtotal visible. Devuelve 0
 * cuando el monto o el subtotal no son números finitos, así el documento
 * nunca imprime ajustes fantasma frente a datos corruptos.
 *
 * Ambos valores se redondean a centavos ANTES de restar: lo que se imprime es
 * lo que se compara, así la tabla siempre cierra (filas + ajuste = total)
 * incluso con subtotales que redondean (off-by-a-cent).
 */
export function calcularAjuste(pago: PaymentDetail, subtotal: number): number {
  const montoRaw = pago.monto;
  const monto =
    typeof montoRaw === 'string' && montoRaw.trim() === ''
      ? Number.NaN
      : Number(montoRaw);
  if (!Number.isFinite(monto) || !Number.isFinite(subtotal)) return 0;
  const subtotalCent = Math.round(subtotal * 100) / 100;
  const montoCent = Math.round(monto * 100) / 100;
  return montoCent - subtotalCent;
}

/** Cantidad de una partida con fallback defensivo (nunca imprime "NaN" ni "0" falso). */
export function formatearCantidad(valor: unknown): string {
  if (valor == null || (typeof valor === 'string' && valor.trim() === '')) {
    return '—';
  }
  const n = Number(valor);
  return Number.isFinite(n) ? String(n) : '—';
}

/** Ajuste con signo explícito: "+$7.48" (recargo) / "−$7.48" (descuento). */
export function formatearAjuste(ajuste: number): string {
  const signo = ajuste > 0 ? '+' : '−';
  return `${signo}${formatearMonto(Math.abs(ajuste))}`;
}

export function buildReceiptHtml(pago: PaymentDetail): string {
  const subtotal = calcularSubtotalVisible(pago);
  // Se muestra el subtotal redondeado a centavos; el ajuste se calculó sobre
  // ese mismo valor redondeado (ver calcularAjuste), así filas + ajuste
  // cierran exactamente con lo impreso.
  const subtotalCent = Math.round(subtotal * 100) / 100;
  const ajuste = Math.round(calcularAjuste(pago, subtotal) * 100) / 100;
  const subtotalValido = Number.isFinite(subtotal);

  const filas = (pago.productos ?? [])
    .map(
      (prod) => `
        <tr>
          <td>${escapeHtml(prod.nombre)}</td>
          <td class="num">${formatearCantidad(prod.cantidad)}</td>
          <td class="num">${formatearMonto(prod.precio)}</td>
          <td class="num">${formatearMonto(prod.cantidad * Number(prod.precio))}</td>
        </tr>`,
    )
    .join('');

  // Ajuste = monto cobrado − subtotal visible; con signo explícito para que
  // "Ajuste +$X" (recargo) / "Ajuste −$X" (descuento) se lea correcto.
  // La frontera de EPSILON se evalúa sobre valores ya redondeados a centavos
  // (sin ruido de punto flotante) y la tabla siempre cierra.
  const filaAjuste =
    subtotalValido && Math.abs(ajuste) >= EPSILON
      ? `
        <tr class="ajuste">
          <td colspan="3">Ajuste</td>
          <td class="num">${formatearAjuste(ajuste)}</td>
        </tr>`
      : '';

  // total_pedido es INFORMATIVO: se muestra solo cuando el backend lo manda y
  // no cuadra con la suma de filas (descuentos/recargos aplicados en el
  // pedido). Nunca altera la aritmética del documento, que cierra con
  // filas + ajuste = total pagado. El backend puede serializar Decimal como
  // string o number: se coacciona antes de tocar strings.
  const totalPedidoRaw = pago.total_pedido;
  const totalPedido =
    totalPedidoRaw == null ||
    (typeof totalPedidoRaw === 'string' && totalPedidoRaw.trim() === '')
      ? Number.NaN
      : Number(totalPedidoRaw);
  const totalPedidoRedondeado = Math.round(totalPedido * 100) / 100;
  const filaTotalPedido =
    subtotalValido &&
    totalPedidoRaw != null &&
    Number.isFinite(totalPedido) &&
    Math.abs(totalPedidoRedondeado - subtotalCent) >= EPSILON
      ? `
        <tr class="total-pedido">
          <td colspan="3">Total del pedido</td>
          <td class="num">${formatearMonto(totalPedidoRedondeado)}</td>
        </tr>`
      : '';

  const avisoCorrupto = subtotalValido
    ? ''
    : `<p class="notice">No se pudieron calcular los montos del pedido.</p>`;
  const montoCoercion =
    typeof pago.monto === 'string' && pago.monto.trim() === ''
      ? Number.NaN
      : Number(pago.monto);
  const avisoMontoCorrupto = Number.isFinite(montoCoercion)
    ? ''
    : `<p class="notice">El total pagado del pago no pudo calcularse.</p>`;

  // new Date(null) es el epoch (01/01/1970): un fecha_pago omitido no debe
  // imprimir una fecha legalmente falsa, sino "—".
  const fecha = pago.fecha_pago ? formatearFecha(pago.fecha_pago) : '—';

  const resumen = [
    ['Folio', escapeHtml(pago.folio)],
    ...(pago.pedido != null
      ? [['Pedido', escapeHtml(`#${pago.pedido}`)] as const]
      : []),
    ['Fecha', fecha],
    ['Cliente', escapeHtml(pago.cliente_nombre ?? '—')],
    ['Método de pago', escapeHtml(pago.tipo_pago_nombre)],
    ...(pago.referencia
      ? [['Referencia', escapeHtml(pago.referencia)] as const]
      : []),
  ]
    .map(
      ([label, value]) => `
        <div class="row">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo ${escapeHtml(pago.folio)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: ${INK};
    margin: 0; padding: 40px; background: #fff;
  }
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid ${BRAND}; padding-bottom: 18px; margin-bottom: 24px;
  }
  .brand { font-size: 26px; font-weight: 800; color: ${BRAND}; }
  .brand small { display: block; font-size: 11px; font-weight: 600; color: ${MUTED}; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }
  .folio { text-align: right; }
  .folio .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${MUTED}; }
  .folio .value { font-size: 20px; font-weight: 700; color: ${INK}; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 1px; color: ${BRAND_DARK}; margin: 26px 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
    color: ${MUTED}; padding: 8px 10px; border-bottom: 1px solid ${BORDER};
  }
  thead th.num, tbody td.num { text-align: right; }
  tbody td { padding: 9px 10px; border-bottom: 1px dashed ${BORDER}; font-size: 14px; color: ${INK}; }
  tfoot td { padding: 10px; font-weight: 700; }
  tfoot td:first-child { text-align: right; }
  tfoot tr.total-pedido td { font-weight: 400; color: ${MUTED}; }
  .notice { color: ${CORAL}; font-size: 12px; margin-top: 4px; }
  .summary { border: 1px solid ${BORDER}; border-radius: 10px; padding: 6px 16px; margin-top: 8px; max-width: 420px; }
  .row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; color: ${INK}; }
  .row span { color: ${MUTED}; }
  .total {
    display: flex; justify-content: space-between; align-items: center;
    background: ${BRAND}; color: #fff; border-radius: 10px; padding: 14px 16px; margin-top: 14px; max-width: 420px;
  }
  .total span { font-size: 15px; font-weight: 600; }
  .total strong { font-size: 26px; font-weight: 800; }
  .footer { margin-top: 34px; font-size: 11px; color: ${MUTED}; text-align: center; }
  .badge { display:inline-block; background: ${CORAL}12; color: ${CORAL}; font-weight:700; padding: 3px 10px; border-radius: 999px; font-size: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      RASSA
      <small>Frutas del campo a tu mesa</small>
    </div>
    <div class="folio">
      <div class="label">Recibo</div>
      <div class="value">${escapeHtml(pago.folio)}</div>
      <span class="badge">Pagado</span>
    </div>
  </div>

  <h2>Detalle del pago</h2>
  <div class="summary">${resumen}</div>

  <h2>Productos</h2>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th class="num">Cantidad</th>
        <th class="num">Precio</th>
        <th class="num">Importe</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
    <tfoot>
      <tr class="sub"><td colspan="3">Subtotal</td><td class="num">${formatearMonto(subtotalCent)}</td></tr>
      ${filaAjuste}
      ${filaTotalPedido}
    </tfoot>
  </table>
  ${avisoCorrupto}
  ${avisoMontoCorrupto}

  <div class="total">
    <span>Total pagado</span>
    <strong>${formatearMonto(pago.monto)}</strong>
  </div>

  <p class="footer">Documento generado el ${fecha} — RASSA</p>
</body>
</html>`;
}

/**
 * Escapa caracteres XML/HTML. Es null-safe para tolerar campos omitidos por
 * el backend: null/undefined se imprimen como "—", mismo contrato defensivo
 * que formatearMonto.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return '—';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
