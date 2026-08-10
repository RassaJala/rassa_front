import { useEffect, useRef } from 'react';
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
 */
export function printHtml(html: string, onClosed?: () => void): void {
  let win: Window | null = null;
  try {
    win = window.open('', '_blank', 'noopener');
  } catch {
    // algunos navegadores lanzan excepción al bloquear popups
  }
  if (!win) {
    alert('Permite popups para este sitio para poder imprimir el recibo.');
    onClosed?.();
    return;
  }
  win.opener = null;
  const notificarError = (error: unknown) => {
    console.error('Error al imprimir el recibo:', error);
    alert('No se pudo imprimir el recibo. Inténtalo de nuevo.');
  };
  let mql: MediaQueryList | null = null;
  let onPrintChange: ((event: MediaQueryListEvent) => void) | null = null;
  const closeAndDetach = () => {
    if (!win) return;
    win.onafterprint = null;
    // Quitar el listener de matchMedia al cerrar (R4-S): el popup muere y
    // no debe seguir escuchando cambios de estado de impresión.
    if (mql && onPrintChange) {
      mql.removeEventListener('change', onPrintChange);
    }
    win.close();
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
      try {
        win?.print();
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
        onClosed?.();
      }
    };
    fallbackTimer = setTimeout(doPrint, PRINT_FALLBACK_MS);
    win.onload = doPrint;
  } catch (error: unknown) {
    notificarError(error);
    onClosed?.();
  }
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
  const { brand, fg, muted, border, surface, bg, accentBg } = colors;

  // Semáforo anti doble-clic: evita abrir dos popups de impresión si el
  // usuario hace doble clic en Imprimir (mismo patrón que el mobile).
  const imprimiendoRef = useRef(false);
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
    const liberar = () => {
      clearTimeout(liberarSemRef.current);
      imprimiendoRef.current = false;
    };
    try {
      const html = buildReceiptHtml(pago);
      // printHtml abre el popup y dispara print() de forma síncrona; la
      // ventana de guard cubre el doble clic y no deja el botón bloqueado.
      // El semáforo se libera cuando el popup REALMENTE cierra (R3-S, como el
      // .finally() del mobile); el timeout queda solo como red de seguridad.
      printHtml(html, liberar);
      liberarSemRef.current = setTimeout(liberar, PRINT_FALLBACK_MS * 3);
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
          <Button variant="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
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

  const productos = pago.productos ?? [];
  // La pantalla cuenta la misma historia que el PDF: subtotal = suma de filas
  // visibles y, si hay descuento/recargo, la misma fila "Ajuste ±$X".
  const subtotal = calcularSubtotalVisible(pago);
  const subtotalCent = Math.round(subtotal * 100) / 100;
  const ajuste = Math.round(calcularAjuste(pago, subtotal) * 100) / 100;
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
            <Button onClick={handleImprimir}>
              <span aria-hidden>🖨</span> Imprimir / PDF
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
                  {formatearMonto(calcularImportePartida(prod))}
                </span>
              </div>
            ))}
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
              {pago.pedido ? (
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
