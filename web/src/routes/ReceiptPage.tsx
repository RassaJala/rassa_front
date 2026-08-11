import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import {
  buildReceiptHtml,
  calcularAjuste,
  calcularImportePartida,
  calcularSubtotalVisible,
  calcularTotalPedidoVisible,
  deberiaMostrarAjuste,
  deberiaMostrarTotalPedido,
  formatearAjuste,
  formatearCantidad,
  formatearFechaSegura,
  redondearCentavos,
} from '@/common/receipt';
import { esPagoIdValido, fetchPago, formatearMonto } from '@/common/payments';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAppColors } from '../hooks/useAppColors';
import api from '../services/api';

// ── Helpers ────────────────────────────────────────────────

/** Tiempo de espera del fallback de impresión si onload no dispara. */
export const PRINT_FALLBACK_MS = 400;

/**
 * Imprime un documento HTML en una ventana nueva. Extraído a un helper
 * unit-testable: abre el popup, escribe el HTML, espera a que cargue (con
 * fallback por timeout) y ejecuta print + close. `onClosed` se invoca cuando
 * el popup se cierra (o no pudo abrirse), para que el llamador libere su
 * semáforo de impresión al cierre real y no por un timeout arbitrario.
 *
 * Devuelve la ventana creada (o null si el popup fue bloqueado/lanzó), para
 * que el llamador pueda verificar win.closed en su red de seguridad (R4-03)
 * en lugar de liberar el semáforo mientras el popup sigue abierto.
 */
export function printHtml(html: string, onClosed?: () => void): Window | null {
  let win: Window | null = null;
  try {
    // NOTA (R1-01): NO usar 'noopener' aquí. Con noopener, window.open()
    // devuelve null en Chrome/Firefox/Edge (la referencia se corta), así que
    // el helper siempre tomaría la rama "popup bloqueado" y nunca imprimiría.
    // La desconexión del opener se hace explícitamente con win.opener = null.
    win = window.open('', '_blank');
  } catch {
    // algunos navegadores lanzan excepción al bloquear popups
  }
  if (!win) {
    alert('Permite popups para este sitio para poder imprimir el recibo.');
    onClosed?.();
    return null;
  }
  win.opener = null;
  const notificarError = (error: unknown) => {
    console.error('Error al imprimir el recibo:', error);
    alert('No se pudo imprimir el recibo. Inténtalo de nuevo.');
  };
  let mql: MediaQueryList | null = null;
  let onPrintChange: ((event: MediaQueryListEvent) => void) | null = null;
  // R4-06: flag + nulling de win. En Chrome afterprint y change de
  // matchMedia('print') pueden dispararse juntos; sin el flag closeAndDetach
  // ejecutaría doble close()/onClosed().
  let detachado = false;
  const closeAndDetach = () => {
    if (!win || detachado) return;
    detachado = true;
    win.onafterprint = null;
    // Quitar el listener de matchMedia al cerrar (R4-S): el popup muere y
    // no debe seguir escuchando cambios de estado de impresión.
    if (mql && onPrintChange) {
      mql.removeEventListener('change', onPrintChange);
    }
    win.close();
    win = null;
    onClosed?.();
  };
  try {
    win.document.write(html);
    win.document.close();
    win.focus();
    // Imprimir recién cuando el navegador terminó de procesar el documento,
    // así el CSS está aplicado; timeout corto como fallback por si load no dispara.
    let printed = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    const doPrint = () => {
      if (printed) return;
      // El usuario pudo cerrar el popup mientras esperábamos el load: no
      // imprimir ni reintentar en una ventana muerta.
      if (win?.closed) {
        clearTimeout(fallbackTimer);
        printed = true;
        onClosed?.();
        return;
      }
      // El documento aún no terminó de procesarse: reintentar en vez de
      // imprimir una página en blanco (el timer anterior ya se ejecutó).
      if (win?.document.readyState === 'loading') {
        fallbackTimer = setTimeout(doPrint, PRINT_FALLBACK_MS);
        return;
      }
      clearTimeout(fallbackTimer);
      printed = true;
      // closeAndDetach también nullea la variable `win` (R4-06); por eso TS
      // no puede probar que sea no-null aquí aunque doPrint ya verificó su
      // existencia arriba. Guard explícito para el narrowing.
      if (!win) return;
      try {
        win.print();
        // Cerrar recién cuando la impresión terminó: en Safari print() no
        // bloquea, así que close() inmediato mataría el popup antes de
        // imprimir. afterprint + matchMedia('print') cubren los casos reales.
        win.onafterprint = () => closeAndDetach();
        mql = win.matchMedia('print');
        onPrintChange = (event: MediaQueryListEvent) => {
          if (!event.matches) closeAndDetach();
        };
        mql.addEventListener('change', onPrintChange);
      } catch (error: unknown) {
        notificarError(error);
        // R4-04: cerrar el popup huérfano también en error; si no, la red de
        // seguridad de la página (verificarPopup) lo vería "abierto" y
        // esperaría para siempre.
        closeAndDetach();
      }
    };
    fallbackTimer = setTimeout(doPrint, PRINT_FALLBACK_MS);
    win.onload = doPrint;
  } catch (error: unknown) {
    notificarError(error);
    // R4-04: ante document.write/focus fallido no dejar el popup en blanco
    // abierto; closeAndDetach ya libera onClosed una sola vez.
    closeAndDetach();
  }
  return win;
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useAppColors>;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm" style={{ color: colors.muted }}>
        {label}
      </span>
      <span
        className="max-w-[60%] text-right text-sm font-semibold"
        style={{ color: colors.fg }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────

export function ReceiptPage() {
  const { paymentId: rawPaymentId } = useParams<{ paymentId: string }>();
  const paymentId = Number(rawPaymentId);
  const paymentIdValid = esPagoIdValido(paymentId);
  const navigate = useNavigate();
  const colors = useAppColors();
  const { brand, coral, fg, muted, border, surface, bg, accentBg } = colors;

  // Semáforo anti doble-clic: evita abrir dos popups de impresión si el
  // usuario hace doble clic en Imprimir (mismo patrón que el mobile).
  const imprimiendoRef = useRef(false);
  // R4-02: estado de UI para feedback visual (ref no re-renderiza). El botón
  // muestra "Imprimiendo…" y se deshabilita mientras el popup está abierto.
  const [imprimiendo, setImprimiendo] = useState(false);
  // R4-03: referencia a la ventana del popup para que la red de seguridad NO
  // libere el semáforo mientras el popup siga abierto (un segundo clic abriría
  // un segundo popup).
  const popupWinRef = useRef<Window | null>(null);
  const liberarSemRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(liberarSemRef.current), []);

  const handleImprimir = () => {
    // Guard de narrowing: pago viene de useQuery (PaymentDetail | undefined)
    // y el botón solo existe tras el guard de render, pero TS no lo sabe en
    // este punto (R2-W1). Sin esto, buildReceiptHtml recibe PaymentDetail |
    // undefined y un typecheck estricto falla.
    if (!pago) return;
    if (imprimiendoRef.current) return;
    imprimiendoRef.current = true;
    setImprimiendo(true);
    const liberar = () => {
      clearTimeout(liberarSemRef.current);
      popupWinRef.current = null;
      imprimiendoRef.current = false;
      setImprimiendo(false);
    };
    try {
      const html = buildReceiptHtml(pago);
      // printHtml abre el popup, dispara print() y llama onClosed (liberar)
      // cuando el popup CIERRA de verdad. Devuelve la ventana creada para
      // que la red de seguridad pueda comprobar win.closed (R4-03).
      popupWinRef.current = printHtml(html, liberar);
      // Red de seguridad: si onClosed nunca disparó pero el popup YA cerró
      // (p.ej. el usuario lo cerró a mano), liberar el semáforo; si el popup
      // sigue abierto, NO liberar y volver a chequear — jamás un segundo
      // popup encima del primero.
      const verificarPopup = () => {
        if (!popupWinRef.current || popupWinRef.current.closed) {
          liberar();
          return;
        }
        liberarSemRef.current = setTimeout(
          verificarPopup,
          PRINT_FALLBACK_MS * 3,
        );
      };
      liberarSemRef.current = setTimeout(verificarPopup, PRINT_FALLBACK_MS * 3);
    } catch (error: unknown) {
      // buildReceiptHtml es síncrono y puede lanzar ante datos corruptos: se
      // libera el semáforo y se informa, el botón no queda muerto de por vida.
      liberar();
      console.error('No se pudo generar el recibo:', error);
      alert('No se pudo generar el recibo. Inténtalo de nuevo.');
    }
  };

  const {
    data: pago,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['pago', paymentId],
    queryFn: () => fetchPago(api, paymentId),
    enabled: paymentIdValid,
  });

  if (isLoading) {
    return <LoadingSpinner className="mt-20" />;
  }

  if (isError || !pago) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-lg" style={{ color: muted }}>
          Error al cargar el recibo
        </p>
        <div className="flex items-center justify-center gap-3">
          {paymentIdValid ? (
            // R4-07: con paymentId inválido, refetch() dispararía
            // fetchPago(api, 'abc') — un callejón sin salida. Solo se ofrece
            // reintentar cuando el id es válido y la falla fue de red/servidor.
            <Button variant="secondary" onClick={() => void refetch()}>
              Reintentar
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => navigate('/vendedor/pedidos')}
          >
            Volver a pedidos
          </Button>
        </div>
      </div>
    );
  }

  const productos = (pago.productos ?? []).filter(
    // Guard por ELEMENTO (R3-01): un backend corrupto puede mandar [null];
    // el map de abajo accedería a prod.nombre y rompería el render.
    (prod): prod is NonNullable<typeof prod> => prod != null,
  );
  // La pantalla cuenta la misma historia que el PDF: subtotal = suma de filas
  // visibles y, si hay descuento/recargo, la misma fila "Ajuste ±$X".
  const subtotal = calcularSubtotalVisible(pago);
  const subtotalCent = redondearCentavos(subtotal);
  const ajuste = redondearCentavos(calcularAjuste(pago, subtotal));
  // Mismo umbral compartido que el PDF (EPSILON en receipt.ts): si cambia,
  // pantalla y documento no divergen (R2-S).
  const mostrarAjuste = deberiaMostrarAjuste(pago, subtotal);
  // Misma fila informativa que el PDF cuando total_pedido no cuadra con la
  // suma de filas (R2-S): pantalla y documento cuentan la misma historia.
  const totalPedidoVisible = calcularTotalPedidoVisible(pago);
  const mostrarTotalPedido = deberiaMostrarTotalPedido(pago, subtotal);

  return (
    <div>
      <PageHeader
        title="Recibo de Pago"
        action={
          <div className="flex items-center gap-3">
            <Button onClick={handleImprimir} disabled={imprimiendo}>
              {imprimiendo ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <span aria-hidden>🖨</span>
              )}{' '}
              {imprimiendo ? 'Imprimiendo…' : 'Imprimir / PDF'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/vendedor/pedidos')}
            >
              ← Volver a pedidos
            </Button>
          </div>
        }
      />

      {/* Success banner */}
      <div
        className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl p-6"
        style={{
          background: brand,
          // R2-04: sombra del verde de marca (BRAND = rgb(36,86,60)) al 18%.
          // Un solo uso: no merece un token propio en la paleta.
          boxShadow: '0 8px 24px rgba(36,86,60,0.18)',
        }}
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
          style={{ background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }}
        >
          ✓
        </span>
        <div>
          <p className="text-xl font-bold text-white">Pago Registrado</p>
          <p className="text-sm text-white/90">
            El pedido fue marcado como entregado
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Products */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold" style={{ color: fg }}>
            Productos
          </h2>
          <div
            className="overflow-hidden rounded-2xl"
            style={{
              background: surface,
              border: `1px solid ${border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-3 text-xs font-bold uppercase tracking-wide"
              style={{ color: muted, background: bg }}
            >
              <span>Producto</span>
              <span className="w-20 text-center">Cantidad</span>
              <span className="w-24 text-right">Precio</span>
              <span className="w-28 text-right">Importe</span>
            </div>
            {productos.map((prod, idx) => (
              <div
                key={`${prod.nombre}-${idx}`}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-4"
                style={
                  idx < productos.length - 1
                    ? { borderBottom: `1px solid ${border}` }
                    : undefined
                }
              >
                <span
                  className="min-w-0 text-sm font-semibold"
                  style={{ color: fg }}
                >
                  {prod.nombre}
                </span>
                <span
                  className="w-20 text-center text-sm"
                  style={{ color: muted }}
                >
                  {formatearCantidad(prod.cantidad)}
                </span>
                <span
                  className="w-24 text-right text-sm"
                  style={{ color: muted }}
                >
                  {formatearMonto(prod.precio)}
                </span>
                <span
                  className="w-28 text-right text-sm font-semibold"
                  style={{ color: fg }}
                >
                  {formatearMonto(
                    // R4-05: redondear a centavos ANTES de formatear (la fila
                    // debe cerrar con el subtotal ya redondeado).
                    redondearCentavos(calcularImportePartida(prod)),
                  )}
                </span>
              </div>
            ))}
            {/* R3-02: la pantalla muestra el mismo aviso que el PDF. Sin esto,
                un subtotal corrupto se veía como "Subtotal —" sin explicación. */}
            {!Number.isFinite(subtotal) ? (
              <p
                className="px-6 py-3 text-sm font-semibold"
                style={{ color: coral }}
              >
                No se pudieron calcular los montos del pedido.
              </p>
            ) : null}
            {/* Subtotal row */}
            <div
              className="flex items-center justify-end gap-6 px-6 py-4"
              style={{ borderTop: `1px solid ${border}` }}
            >
              <span className="text-sm font-semibold" style={{ color: muted }}>
                Subtotal
              </span>
              <span
                className="w-28 text-right text-sm font-bold"
                style={{ color: fg }}
              >
                {formatearMonto(subtotalCent)}
              </span>
            </div>
            {mostrarAjuste ? (
              <div
                className="flex items-center justify-end gap-6 px-6 py-4"
                style={{ borderTop: `1px solid ${border}` }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: muted }}
                >
                  Ajuste
                </span>
                <span
                  className="w-28 text-right text-sm font-bold"
                  style={{ color: fg }}
                >
                  {formatearAjuste(ajuste)}
                </span>
              </div>
            ) : null}
            {mostrarTotalPedido ? (
              <div
                className="flex items-center justify-end gap-6 px-6 py-4"
                style={{ borderTop: `1px solid ${border}` }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: muted }}
                >
                  Total del pedido
                </span>
                <span
                  className="w-28 text-right text-sm font-semibold"
                  style={{ color: muted }}
                >
                  {formatearMonto(totalPedidoVisible)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Summary */}
        <div>
          <h2 className="mb-3 text-lg font-bold" style={{ color: fg }}>
            Resumen del pago
          </h2>
          <div
            className="overflow-hidden rounded-2xl"
            style={{
              background: surface,
              border: `1px solid ${border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div className="p-5">
              <DetailRow label="Folio" value={pago.folio} colors={colors} />
              {pago.pedido != null ? (
                // R2-06: mismo contrato que el PDF (`!= null`, no truthy): el
                // pedido 0 es válido y debe mostrarse como "#0".
                <DetailRow
                  label="Pedido"
                  value={`#${pago.pedido}`}
                  colors={colors}
                />
              ) : null}
              <DetailRow
                label="Fecha"
                value={formatearFechaSegura(pago.fecha_pago)}
                colors={colors}
              />
              <DetailRow
                label="Cliente"
                value={pago.cliente_nombre ?? '—'}
                colors={colors}
              />
              <DetailRow
                label="Método de pago"
                value={pago.tipo_pago_nombre}
                colors={colors}
              />
              {pago.referencia ? (
                <DetailRow
                  label="Referencia"
                  value={pago.referencia}
                  colors={colors}
                />
              ) : null}
            </div>
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ background: accentBg }}
            >
              <span className="text-base font-bold" style={{ color: fg }}>
                Total pagado
              </span>
              <span className="text-2xl font-bold" style={{ color: brand }}>
                {formatearMonto(pago.monto)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
