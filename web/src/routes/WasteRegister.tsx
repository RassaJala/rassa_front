import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  type PublishedProduct,
  type PublishedPublication,
  WASTE_DECISION_OPTIONS,
  type WasteDecisionOption,
  validateWasteRecord,
} from '@/common/wasteRegister';
import type { Order } from '@root/types';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormSelect } from '../components/ui/FormSelect';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { TextArea } from '../components/ui/TextArea';
import { Toast, type ToastState } from '../components/ui/Toast';
import { useAppColors } from '../hooks/useAppColors';
import { extractApiError } from '../utils/apiErrors';
import {
  createWasteRecord,
  fetchWasteOrders,
  fetchWastePublications,
} from '../services/waste';

const labelClass = 'text-sm font-medium text-gray-700 dark:text-gray-300';

// --- Page ---

export function WasteRegister() {
  const navigate = useNavigate();
  const colors = useAppColors();
  const queryClient = useQueryClient();

  const [productoId, setProductoId] = useState('');
  const [pedidoId, setPedidoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [decisionId, setDecisionId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  const {
    data: publications = [],
    isLoading: loadingProducts,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery<PublishedPublication[]>({
    queryKey: ['publicaciones-current'],
    queryFn: fetchWastePublications,
    staleTime: 60_000,
    // Retry storm guard: axios-retry (3x) + TanStack retry (3x) would send up
    // to 9 attempts per endpoint on a degraded backend; the form has a manual
    // "Reintentar" button instead.
    retry: false,
  });

  const {
    data: pedidos = [],
    isLoading: loadingPedidos,
    isError: pedidosError,
    refetch: refetchPedidos,
  } = useQuery<Order[]>({
    queryKey: ['waste-pedidos'],
    queryFn: fetchWasteOrders,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (productsError) {
      console.error('[waste] publications query failed', productsError);
    }
    if (pedidosError) {
      console.error('[waste] orders query failed', pedidosError);
    }
  }, [productsError, pedidosError]);

  const products = useMemo<PublishedProduct[]>(
    () =>
      publications
        .flatMap((publication) => publication.productos)
        .filter((product) => product.stock > 0),
    [publications],
  );

  // Decisiones de merma: catálogo fijo (ids 1-4 sincronizados con el seed del
  // backend). El endpoint /decisiones-merma/ es solo-admin y el vendedor que
  // registra mermas recibiría 403; usar el fallback evita el error.
  const decisionOptions = WASTE_DECISION_OPTIONS;

  const selectedProduct =
    products.find(
      (product) => product.id_producto_semanal === Number(productoId),
    ) ?? null;

  const mutation = useMutation({
    mutationFn: createWasteRecord,
    onSuccess: async () => {
      // Refresh product stock BEFORE resetting the form so the next payload is
      // validated against the real stock, not the stale pre-merma value.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['waste-records'] }),
        queryClient.invalidateQueries({ queryKey: ['publicaciones-current'] }),
      ]);
      setToast({ message: 'Merma registrada correctamente.', type: 'success' });
      setProductoId('');
      setPedidoId('');
      setCantidad('');
      setMotivo('');
      setComentarios('');
      setDecisionId('');
      setErrors({});
    },
    onError: (err: unknown) => {
      setToast({
        message: extractApiError(err, [
          'fk_producto_semanal',
          'fk_pedido',
          'cantidad',
          'motivo',
          'fk_decision',
          'comentarios',
          'detail',
        ]),
        type: 'error',
      });
    },
  });

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const nextErrors: Record<string, string> = {
      ...validateWasteRecord({
        pedido: pedidoId,
        producto: selectedProduct,
        cantidad,
        motivo,
        stock: selectedProduct?.stock,
      }),
    };

    if (!decisionId) {
      nextErrors.decision = 'Elige una decisión.';
    }

    setErrors(nextErrors);
    if (
      Object.keys(nextErrors).length > 0 ||
      !pedidoId ||
      !selectedProduct ||
      !decisionId
    ) {
      return;
    }

    mutation.mutate({
      fk_producto_semanal: selectedProduct.id_producto_semanal,
      fk_pedido: Number(pedidoId),
      cantidad: Number(cantidad),
      motivo: motivo.trim(),
      fk_decision: Number(decisionId),
      ...(comentarios.trim() ? { comentarios: comentarios.trim() } : {}),
    });
  }

  if (loadingPedidos || loadingProducts) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (productsError || pedidosError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
        <span className="text-5xl" aria-hidden>
          ⚠️
        </span>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No se pudieron cargar los datos.
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Revisa tu conexión e inténtalo de nuevo.
        </p>
        <div className="mt-2 flex gap-3">
          <Button
            variant="primary"
            onClick={() => {
              void refetchProducts();
              void refetchPedidos();
            }}
          >
            Reintentar
          </Button>
          <Button variant="ghost" onClick={() => navigate('/vendedor/ventas')}>
            ← Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Registrar Merma"
        action={
          <Button variant="ghost" onClick={() => navigate('/vendedor/ventas')}>
            ← Volver
          </Button>
        }
      />

      <Card className="max-w-[560px]">
        <p className="mb-5 mt-0 text-[13px] text-gray-500 dark:text-gray-400">
          Descuenta stock del producto publicado.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="waste-pedido">
              Pedido *
            </label>
            <FormSelect
              id="waste-pedido"
              colors={colors}
              hasError={Boolean(errors.pedido)}
              value={pedidoId}
              onChange={(e) => setPedidoId(e.target.value)}
            >
              <option value="">Elige un pedido…</option>
              {pedidos.map((order) => (
                <option key={order.id_pedido} value={order.id_pedido}>
                  {`Pedido #${order.id_pedido} · ${order.cliente_nombre ?? 'Cliente'} · $${order.total}`}
                </option>
              ))}
            </FormSelect>
            {errors.pedido ? (
              <p className="text-xs text-red-500">{errors.pedido}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="waste-producto">
              Producto publicado *
            </label>
            <FormSelect
              id="waste-producto"
              colors={colors}
              hasError={Boolean(errors.producto)}
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
            >
              <option value="">Seleccionar producto…</option>
              {products.map((product) => (
                <option
                  key={product.id_producto_semanal}
                  value={product.id_producto_semanal}
                >
                  {product.producto} — Stock: {product.stock} {product.unidad}
                </option>
              ))}
            </FormSelect>
            {errors.producto ? (
              <p className="text-xs text-red-500">{errors.producto}</p>
            ) : null}
            {!loadingProducts && products.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                No hay publicaciones activas esta semana. Publica un producto
                para poder registrar mermas.
              </div>
            ) : null}
            {selectedProduct ? (
              <p className="text-[13px] text-gray-500 dark:text-gray-400">
                Stock disponible: {selectedProduct.stock}{' '}
                {selectedProduct.unidad} · Precio: ${selectedProduct.precio}
              </p>
            ) : null}
          </div>

          <Input
            label="Cantidad *"
            type="number"
            min="1"
            step="1"
            placeholder="0"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            {...(errors.cantidad ? { error: errors.cantidad } : {})}
            colors={colors}
          />

          <Input
            label="Motivo *"
            placeholder="Ej: producto dañado por el clima"
            maxLength={300}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            {...(errors.motivo ? { error: errors.motivo } : {})}
            colors={colors}
          />

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Comentarios (opcional)</label>
            <TextArea
              colors={colors}
              placeholder="Detalles adicionales…"
              maxLength={500}
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="waste-decision">
              Decisión *
            </label>
            <FormSelect
              id="waste-decision"
              colors={colors}
              hasError={Boolean(errors.decision)}
              value={decisionId}
              onChange={(e) => setDecisionId(e.target.value)}
            >
              <option value="">Elige una decisión…</option>
              {decisionOptions.map((option) => (
                <option key={option.id_decision} value={option.id_decision}>
                  {option.decision}
                </option>
              ))}
            </FormSelect>
            {errors.decision ? (
              <p className="text-xs text-red-500">{errors.decision}</p>
            ) : null}
          </div>

          <div className="mt-2 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/vendedor/ventas')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Guardando…' : 'Registrar Merma'}
            </Button>
          </div>
        </form>
      </Card>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
