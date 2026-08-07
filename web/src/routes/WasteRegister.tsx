import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  type PublishedProduct,
  type PublishedPublication,
  WASTE_DECISION_OPTIONS,
  type WasteDecisionOption,
  type WasteRecordPayload,
} from '@/common/wasteRegister';
import type { Order } from '@root/types';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { FormSelect } from '../components/ui/FormSelect';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { TextArea } from '../components/ui/TextArea';
import { Toast, type ToastState } from '../components/ui/Toast';
import { useAppColors } from '../hooks/useAppColors';
import api from '../services/api';
import { extractApiError } from '../utils/apiErrors';

const labelClass = 'text-sm font-medium text-gray-700 dark:text-gray-300';

// --- Page ---

export function WasteRegister() {
  const navigate = useNavigate();
  const colors = useAppColors();
  const { muted, border, surface } = colors;
  const queryClient = useQueryClient();

  const [productoId, setProductoId] = useState('');
  const [pedidoId, setPedidoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [decisionId, setDecisionId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  const { data: publications = [], isLoading: loadingProducts } = useQuery<
    PublishedPublication[]
  >({
    queryKey: ['publicaciones-current'],
    queryFn: async () => {
      const res = await api.get<{ data: PublishedPublication[] }>(
        '/publicaciones/current/',
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery<Order[]>({
    queryKey: ['waste-pedidos'],
    queryFn: async () => {
      const res = await api.get<{ results?: Order[] }>('/pedidos/');
      return res.data.results ?? [];
    },
    staleTime: 60_000,
  });

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
    mutationFn: async (payload: WasteRecordPayload) => {
      const res = await api.post<{ data: unknown }>('/mermas/', payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['waste-records'] });
      void queryClient.invalidateQueries({
        queryKey: ['publicaciones-current'],
      });
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
    const nextErrors: Record<string, string> = {};
    const cantidadNum = Number(cantidad);

    if (!pedidoId) {
      nextErrors.pedidoId = 'Selecciona un pedido.';
    }
    if (!productoId) {
      nextErrors.productoId = 'Selecciona un producto publicado.';
    }
    if (!cantidad || !Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      nextErrors.cantidad = 'La cantidad debe ser un número entero mayor a 0.';
    } else if (cantidadNum > 999_999_999) {
      nextErrors.cantidad = 'La cantidad es demasiado grande.';
    } else if (selectedProduct && cantidadNum > selectedProduct.stock) {
      nextErrors.cantidad = `Stock disponible: ${selectedProduct.stock}.`;
    }
    if (!motivo.trim()) {
      nextErrors.motivo = 'El motivo es obligatorio.';
    } else if (motivo.trim().length > 300) {
      nextErrors.motivo = 'El motivo no puede superar los 300 caracteres.';
    }
    if (!decisionId) {
      nextErrors.decisionId = 'Elige una decisión.';
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
      cantidad: cantidadNum,
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

      <div
        style={{
          maxWidth: 560,
          background: surface,
          border: `1px solid ${border}`,
          borderRadius: 16,
          padding: 24,
        }}
      >
        <p
          style={{ fontSize: 13, color: muted, marginTop: 0, marginBottom: 20 }}
        >
          Descuenta stock del producto publicado.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Pedido *</label>
            <FormSelect
              colors={colors}
              hasError={Boolean(errors.pedidoId)}
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
            {errors.pedidoId ? (
              <p className="text-xs text-red-500">{errors.pedidoId}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Producto publicado *</label>
            <FormSelect
              colors={colors}
              hasError={Boolean(errors.productoId)}
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
            {errors.productoId ? (
              <p className="text-xs text-red-500">{errors.productoId}</p>
            ) : null}
            {!loadingProducts && products.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                No hay publicaciones activas esta semana. Publica un producto
                para poder registrar mermas.
              </div>
            ) : null}
            {selectedProduct ? (
              <p style={{ fontSize: 13, color: muted }}>
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
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Decisión *</label>
            <FormSelect
              colors={colors}
              hasError={Boolean(errors.decisionId)}
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
            {errors.decisionId ? (
              <p className="text-xs text-red-500">{errors.decisionId}</p>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 8,
            }}
          >
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
      </div>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
