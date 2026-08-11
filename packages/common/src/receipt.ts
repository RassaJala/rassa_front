import {
  BORDER,
  BRAND,
  BRAND_DARK,
  BRAND_NAME,
  BRAND_TAGLINE,
  CORAL,
  INK,
  MUTED,
} from './brand';
import { formatearFecha } from './dates';
import { formatearMonto } from './payments';
import type { PaymentDetail } from './payments';

/** Etiqueta UI del badge del documento (R2-05: no es un token de marca). */
const BADGE_PAGADO = 'Pagado';

/** Umbral (en pesos) bajo el cual un ajuste o discrepancia se ignora. */
const EPSILON = 0.005;

/** Redondea a centavos: lo que se imprime es lo que se compara. */
export function redondearCentavos(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Coacciona un valor numérico del backend a number; NaN cuando es corrupto. */
function coercerNumero(raw: unknown): number {
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
    return Number.NaN;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

/**
 * Importe de una partida (cantidad × precio) con contrato NaN-safe: si la
 * cantidad o el precio no son números finitos (null, '', '12,50', 'abc'),
 * devuelve NaN en lugar de un falso $0.00. Una fila corrupta vuelve NaN el
 * subtotal y dispara el aviso del documento, nunca un importe inventado.
 * Compartido con las pantallas (mobile y web) para que fila, subtotal y
 * documento cuenten la misma historia.
 */
export function calcularImportePartida(
  partida: {
    readonly cantidad?: number | string | null;
    readonly precio?: number | string | null;
  } | null,
): number {
  // Guard por ELEMENTO, no solo por forma del array (R3-01): un backend
  // corrupto puede mandar [null] y partida.cantidad sobre null lanzaría
  // TypeError en el top-level del render (pantalla en blanco).
  if (partida == null) return Number.NaN;
  const cantidad =
    partida.cantidad == null ? Number.NaN : Number(partida.cantidad);
  const precio = partida.precio == null ? Number.NaN : Number(partida.precio);
  return Number.isFinite(cantidad) && Number.isFinite(precio)
    ? cantidad * precio
    : Number.NaN;
}

/**
 * Subtotal del recibo: la suma de las filas de producto VISIBLES. Es la única
 * fuente de verdad del subtotal y coincide con el que muestran las pantallas
 * (web y mobile), de modo que documento y pantalla nunca se contradicen.
 * total_pedido del backend solo se despliega como fila informativa cuando no
 * cuadra con la suma (ver buildReceiptHtml).
 *
 * Contrato anti-corrupción: productos: null (campo ausente/corrupto) devuelve
 * NaN en lugar de un falso $0.00, para que el aviso del documento se dispare
 * y la pantalla no muestre "Subtotal $0.00" + "Ajuste +$X" sin contexto.
 */
export function calcularSubtotalVisible(pago: PaymentDetail): number {
  // Guard de forma, no solo de null (R3-01): un backend corrupto puede mandar
  // {} o un string en lugar de un array, y .reduce sobre eso lanzaría
  // TypeError. Solo un array real suma filas; cualquier otra forma es NaN.
  if (!Array.isArray(pago.productos)) return Number.NaN;
  return pago.productos.reduce(
    (acc, prod) => acc + calcularImportePartida(prod),
    0,
  );
}

/** monto del pago coaccionado a number; NaN cuando es null, vacío o corrupto. */
export function calcularMontoVisible(pago: PaymentDetail): number {
  return coercerNumero(pago.monto);
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
  const monto = calcularMontoVisible(pago);
  if (!Number.isFinite(monto) || !Number.isFinite(subtotal)) return 0;
  return redondearCentavos(monto) - redondearCentavos(subtotal);
}

/**
 * True cuando el ajuste debe mostrarse: el monto difiere del subtotal visible
 * por más del umbral de centavos (EPSILON). Compartido por el documento y las
 * pantallas para que ninguna hardcodee el umbral y puedan divergir.
 */
export function deberiaMostrarAjuste(
  pago: PaymentDetail,
  subtotal: number,
): boolean {
  if (!Number.isFinite(subtotal)) return false;
  return Math.abs(redondearCentavos(calcularAjuste(pago, subtotal))) >= EPSILON;
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

/**
 * Fecha legible del pago, con contrato defensivo: un fecha_pago ausente o no
 * parseable se imprime como "—", nunca "Invalid Date" ni el epoch.
 */
export function formatearFechaSegura(fecha: string | null | undefined): string {
  if (fecha == null || !Number.isFinite(Date.parse(fecha))) return '—';
  return formatearFecha(fecha);
}

/**
 * total_pedido coaccionado a number (el backend puede serializar Decimal como
 * string o number). Devuelve NaN cuando el campo es null, vacío o corrupto.
 */
export function calcularTotalPedidoVisible(pago: PaymentDetail): number {
  return coercerNumero(pago.total_pedido);
}

/**
 * True cuando total_pedido debe mostrarse como fila INFORMATIVA: el backend lo
 * mandó y no cuadra con el subtotal visible (descuentos/recargos aplicados en
 * el pedido). Compartido por el documento y las pantallas (R2-S) para que
 * todas cuenten la misma historia.
 */
export function deberiaMostrarTotalPedido(
  pago: PaymentDetail,
  subtotal: number,
): boolean {
  const total = calcularTotalPedidoVisible(pago);
  if (!Number.isFinite(total) || !Number.isFinite(subtotal)) return false;
  return (
    Math.abs(redondearCentavos(total) - redondearCentavos(subtotal)) >= EPSILON
  );
}

export function buildReceiptHtml(pago: PaymentDetail): string {
  const subtotal = calcularSubtotalVisible(pago);
  // Se muestra el subtotal redondeado a centavos; el ajuste se calculó sobre
  // ese mismo valor redondeado (ver calcularAjuste), así filas + ajuste
  // cierran exactamente con lo impreso.
  const subtotalCent = redondearCentavos(subtotal);
  const ajuste = redondearCentavos(calcularAjuste(pago, subtotal));
  const subtotalValido = Number.isFinite(subtotal);

  const filas = Array.isArray(pago.productos)
    ? pago.productos
        // Guard por ELEMENTO (R3-01): [null] no debe lanzar en prod.nombre.
        .filter((prod): prod is NonNullable<typeof prod> => prod != null)
        .map(
          (prod) => `
        <tr>
          <td>${escapeHtml(prod.nombre)}</td>
          <td class="num">${formatearCantidad(prod.cantidad)}</td>
          <td class="num">${formatearMonto(prod.precio)}</td>
          <td class="num">${formatearMonto(
            // R4-05: redondear a centavos ANTES de formatear; toFixed(2) y
            // Math.round divergen con >2 decimales (p.ej. 10.005) y la fila
            // debe cerrar con el subtotal ya redondeado.
            redondearCentavos(calcularImportePartida(prod)),
          )}</td>
        </tr>`,
        )
        .join('')
    : '';

  // Ajuste = monto cobrado − subtotal visible; con signo explícito para que
  // "Ajuste +$X" (recargo) / "Ajuste −$X" (descuento) se lea correcto.
  // La frontera se evalúa sobre valores ya redondeados a centavos (sin ruido
  // de punto flotante) con el mismo umbral compartido que las pantallas
  // (deberiaMostrarAjuste), y la tabla siempre cierra.
  const filaAjuste = deberiaMostrarAjuste(pago, subtotal)
    ? `
        <tr class="ajuste">
          <td colspan="3">Ajuste</td>
          <td class="num">${formatearAjuste(ajuste)}</td>
        </tr>`
    : '';

  // total_pedido es INFORMATIVO: se muestra solo cuando el backend lo manda y
  // no cuadra con la suma de filas (descuentos/recargos aplicados en el
  // pedido). Nunca altera la aritmética del documento, que cierra con
  // filas + ajuste = total pagado.
  const totalPedido = calcularTotalPedidoVisible(pago);
  const totalPedidoRedondeado = redondearCentavos(totalPedido);
  const filaTotalPedido = deberiaMostrarTotalPedido(pago, subtotal)
    ? `
        <tr class="total-pedido">
          <td colspan="3">Total del pedido</td>
          <td class="num">${formatearMonto(totalPedidoRedondeado)}</td>
        </tr>`
    : '';

  const avisoCorrupto = subtotalValido
    ? ''
    : `<p class="notice">No se pudieron calcular los montos del pedido.</p>`;
  const avisoMontoCorrupto = Number.isFinite(calcularMontoVisible(pago))
    ? ''
    : `<p class="notice">El total pagado del pago no pudo calcularse.</p>`;

  // Un fecha_pago ausente o no parseable no debe imprimir "Invalid Date" ni
  // el epoch (01/01/1970), sino "—".
  const fecha = formatearFechaSegura(pago.fecha_pago);
  // R3-03: el pie indica cuándo se GENERÓ el documento, no cuándo se pagó.
  // La fecha del pago ya aparece en la fila Fecha del resumen; con fecha_pago
  // corrupta el pie decía "Documento generado el —", un contrasentido.
  const fechaGeneracion = formatearFecha(new Date().toISOString());

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
      ${BRAND_NAME}
      <small>${BRAND_TAGLINE}</small>
    </div>
    <div class="folio">
      <div class="label">Recibo</div>
      <div class="value">${escapeHtml(pago.folio)}</div>
      <span class="badge">${BADGE_PAGADO}</span>
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

  <p class="footer">Documento generado el ${fechaGeneracion} — ${BRAND_NAME}</p>
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
