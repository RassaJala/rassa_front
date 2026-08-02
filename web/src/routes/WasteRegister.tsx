import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

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

// --- Types ---

interface WasteDecision {
  readonly id_decision: number;
  decision: string;
  readonly creado_en: string;
  estado: boolean;
}

interface WasteDecisionOption {
  readonly id_decision: number;
  readonly decision: string;
}

interface PublishedProduct {
  readonly id_producto_semanal: number;
  producto: string;
  unidad: string;
  stock: number;
  precio: string;
  foto: string;
}

interface PublishedPublication {
  readonly id_publicacion: number;
  agricultor: { id_usuario: number; nombre: string; apellido: string } | null;
  fecha_publicacion: string;
  semana: string;
  productos: PublishedProduct[];
}

interface WasteRecordPayload {
  fk_producto_semanal: number;
  cantidad: number;
  motivo: string;
  comentarios?: string;
  fk_decision: number;
}

// Opciones iniciales (seed del backend: id 1-4).
const WASTE_DECISION_OPTIONS: WasteDecisionOption[] = [
  { id_decision: 1, decision: 'Donar' },
  { id_decision: 2, decision: 'Desechar' },
  { id_decision: 3, decision: 'Vender más barato' },
  { id_decision: 4, decision: 'Compostar' },
];

const labelClass = 'text-sm font-medium text-gray-700 dark:text-gray-300';

// --- Page ---

export function WasteRegister() {
  const navigate = useNavigate();
  const colors = useAppColors();
  const { muted, border, surface } = colors;
  const queryClient = useQueryClient();

  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [decisionId, setDecisionId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  const { data: decisions = [], isLoading: loadingDecisions } = useQuery<
    WasteDecision[]
  >({
    queryKey: ['waste-decisions'],
    queryFn: async () => {
      const res = await api.get<{ data: { results: WasteDecision[] } }>(
        '/decisiones-merma/',
      );
      return res.data.data.results;
    },
    staleTime: 60_000,
  });

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

  const products = useMemo<PublishedProduct[]>(
    () =>
      publications
        .flatMap((publication) => publication.productos)
        .filter((product) => product.stock > 0),
    [publications],
  );

  const decisionOptions = useMemo<WasteDecisionOption[]>(() => {
    const active = decisions.filter((decision) => decision.estado);
    if (active.length === 0) return WASTE_DECISION_OPTIONS;
    return active.map((decision) => ({
      id_decision: decision.id_decision,
      decision: decision.decision,
    }));
  }, [decisions]);

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
      setToast({ message: 'Merma registrada correctamente.', type: 'success' });
      setProductoId('');
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

    if (!productoId) {
      nextErrors.productoId = 'Seleccioná un producto publicado.';
    }
    if (!cantidad || !Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      nextErrors.cantidad = 'La cantidad debe ser un número entero mayor a 0.';
    } else if (selectedProduct && cantidadNum > selectedProduct.stock) {
      nextErrors.cantidad = `Stock disponible: ${selectedProduct.stock}.`;
    }
    if (!motivo.trim()) {
      nextErrors.motivo = 'El motivo es obligatorio.';
    } else if (motivo.trim().length > 300) {
      nextErrors.motivo = 'El motivo no puede superar los 300 caracteres.';
    }
    if (!decisionId) {
      nextErrors.decisionId = 'Elegí una decisión.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedProduct || !decisionId) {
      return;
    }

    mutation.mutate({
      fk_producto_semanal: selectedProduct.id_producto_semanal,
      cantidad: cantidadNum,
      motivo: motivo.trim(),
      fk_decision: Number(decisionId),
      ...(comentarios.trim() ? { comentarios: comentarios.trim() } : {}),
    });
  }

  if (loadingDecisions || loadingProducts) {
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
                No hay publicaciones activas esta semana. Publicá un producto
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
              <option value="">Elegí una decisión…</option>
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
