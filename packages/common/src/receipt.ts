import { formatearFecha } from './dates';
import { calcularSubtotal, formatearMonto } from './payments';
import type { PaymentDetail } from './payments';

const BRAND = '#24563C';
const BRAND_DARK = '#1B402E';
const CORAL = '#DE393A';
const INK = '#2D3328';
const MUTED = '#5E6B5E';
const BORDER = '#E2E6DF';

function fmt(amount: string | number): string {
  const n = Number(amount);
  // Dato corrupto (p. ej. "12,50"): no debe parecer un monto real.
  return Number.isFinite(n) ? formatearMonto(n) : '—';
}

export function buildReceiptHtml(pago: PaymentDetail): string {
  const subtotal = calcularSubtotal(pago.productos ?? []);

  const filas = (pago.productos ?? [])
    .map(
      (prod) => `
        <tr>
          <td>${escapeHtml(prod.nombre)}</td>
          <td class="num">${prod.cantidad}</td>
          <td class="num">${fmt(prod.precio)}</td>
          <td class="num">${fmt(prod.cantidad * Number(prod.precio))}</td>
        </tr>`,
    )
    .join('');

  const resumen = [
    ['Folio', escapeHtml(pago.folio)],
    ...(pago.pedido ? [['Pedido', `#${pago.pedido}`] as const] : []),
    ['Fecha', formatearFecha(pago.fecha_pago)],
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
        <td>Producto</td>
        <td class="num">Cantidad</td>
        <td class="num">Precio</td>
        <td class="num">Importe</td>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
    <tfoot>
      <tr class="sub"><td colspan="3">Subtotal</td><td class="num">${fmt(subtotal)}</td></tr>
    </tfoot>
  </table>

  <div class="total">
    <span>Total pagado</span>
    <strong>${fmt(pago.monto)}</strong>
  </div>

  <p class="footer">Documento generado el ${formatearFecha(pago.fecha_pago)} — RASSA</p>
</body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
