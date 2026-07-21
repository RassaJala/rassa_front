import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';
import { FormSelect } from './ui/FormSelect';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import type { AppColors, useAppColors } from '../hooks/useAppColors';
import api from '../services/api';

// ── Types ──────────────────────────────────────────────────

interface Category {
  id_categoria: number;
  nombre: string;
}

interface Unidad {
  id_unidad: number;
  tipo: string;
}

export interface Producto {
  id_producto: number;
  nombre_producto: string;
  descripcion: string;
  precio: string;
  stock: number;
  es_perecedero: boolean;
  estado: boolean;
  categoria: Category | number;
  unidad: Unidad | null;
  imagen_principal: string | null;
  imagen: string | null;
  imagenes?: { id_imagen: number; url: string; es_principal: boolean }[];
}

interface ApiResponse<T> {
  data: T;
}

// ── Helpers ────────────────────────────────────────────────

const BASE = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
).replace(/\/api\/?$/, '');

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const clean = path.replace(/\.\./g, '').replace(/^\/+/, '/');
  return `${BASE}${clean}`;
}

// ── Form State ─────────────────────────────────────────────

interface FormState {
  nombre_producto: string;
  descripcion: string;
  precio: string;
  stock: string;
  es_perecedero: boolean;
  categoriaId: number | null;
  unidadId: number | null;
  imageFile: File | null;
  imagePreview: string | null;
  existingImageUrl: string | null;
  imageDeleted: boolean;
}

function buildInitialForm(producto?: Producto): FormState {
  return {
    nombre_producto: producto?.nombre_producto ?? '',
    descripcion: producto?.descripcion ?? '',
    precio: producto?.precio ?? '',
    stock: String(producto?.stock ?? 0),
    es_perecedero: producto?.es_perecedero ?? false,
    categoriaId:
      typeof producto?.categoria === 'object'
        ? producto.categoria.id_categoria
        : (producto?.categoria ?? null),
    unidadId:
      typeof producto?.unidad === 'object' && producto.unidad !== null
        ? producto.unidad.id_unidad
        : (producto?.unidad ?? null),
    imageFile: null,
    imagePreview: null,
    existingImageUrl: mediaUrl(producto?.imagen_principal ?? producto?.imagen),
    imageDeleted: false,
  };
}

// ── Validation ─────────────────────────────────────────────

function validate(form: FormState): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.nombre_producto.trim())
    errs.nombre_producto = 'El nombre es obligatorio.';
  const p = parseFloat(form.precio);
  if (!form.precio || isNaN(p) || p <= 0)
    errs.precio = 'El precio debe ser mayor a 0.';
  if (!form.categoriaId) errs.categoriaId = 'Seleccioná una categoría.';
  if (form.stock && isNaN(parseInt(form.stock, 10)))
    errs.stock = 'El stock debe ser un número entero.';
  return errs;
}

// ── Payload builder ────────────────────────────────────────

function buildPayload(form: FormState) {
  return {
    nombre_producto: form.nombre_producto.trim(),
    descripcion: form.descripcion.trim(),
    precio: parseFloat(form.precio),
    stock: parseInt(form.stock, 10) || 0,
    es_perecedero: form.es_perecedero,
    fk_categoria: form.categoriaId,
    fk_unidad: form.unidadId,
    estado: true,
  };
}

// ── Image helpers ──────────────────────────────────────────

async function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res((reader.result as string).split(',')[1] ?? '');
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

async function deleteOldImages(productId: number): Promise<void> {
  const { data: detailRes } = await api.get<ApiResponse<Producto>>(
    `/productos/${productId}/`,
  );
  const imgs = detailRes.data.imagenes;
  if (imgs && imgs.length > 0) {
    await Promise.all(
      imgs.map((img) =>
        api
          .delete(`/productos/${productId}/imagen/${img.id_imagen}/`)
          .catch(console.error),
      ),
    );
  }
}

async function uploadImage(productId: number, file: File): Promise<void> {
  const base64 = await toBase64(file);
  let uploaded = false;
  for (let attempt = 0; attempt < 2 && !uploaded; attempt++) {
    try {
      await api.post(`/productos/${productId}/imagen/`, {
        imagen_base64: base64,
        es_principal: true,
      });
      uploaded = true;
    } catch (imgErr) {
      if (attempt === 1) throw imgErr;
    }
  }
}

// ── Props ──────────────────────────────────────────────────

interface ProductFormModalProps {
  producto?: Producto;
  categories: Category[];
  unidades: Unidad[];
  colors: ReturnType<typeof useAppColors>;
  onClose: () => void;
  onSaved: () => void;
}

// ── ProductFormModal ───────────────────────────────────────
// ponytail: extraído de farmer.tsx (#24), handleSave descompuesto (#26/#48),
// isDirty + confirmación al cerrar (#31)
export function ProductFormModal({
  producto,
  categories,
  unidades,
  colors,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const qc = useQueryClient();
  const { brand, coral, muted, border, surface, bg, fg, accentBg } = colors;
  const fileRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(producto);

  const initialForm = useMemo(() => buildInitialForm(producto), [producto]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
  );

  // ponytail: confirmación al cerrar con cambios sin guardar (#31)
  const handleClose = useCallback(() => {
    if (
      isDirty &&
      !window.confirm('Tenés cambios sin guardar. ¿Cerrar de todas formas?')
    )
      return;
    onClose();
  }, [isDirty, onClose]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, image: 'La imagen no puede superar 5 MB.' }));
      return;
    }
    if (file.type === 'image/svg+xml') {
      setErrors((p) => ({ ...p, image: 'No se permiten archivos SVG.' }));
      return;
    }

    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    const preview = URL.createObjectURL(file);
    setForm((p) => ({
      ...p,
      imageFile: file,
      imagePreview: preview,
      existingImageUrl: null,
      imageDeleted: true,
    }));
  }

  function handleRemoveImage(e: React.MouseEvent) {
    e.stopPropagation();
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm((p) => ({
      ...p,
      imageFile: null,
      imagePreview: null,
      existingImageUrl: null,
      imageDeleted: true,
    }));
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSave() {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setGeneralError(null);

    try {
      const payload = buildPayload(form);

      const { data } = isEditing
        ? await api.patch<ApiResponse<Producto>>(
            `/productos/${producto!.id_producto}/`,
            payload,
          )
        : await api.post<ApiResponse<Producto>>('/productos/', payload);
      const saved = data.data;

      if (isEditing && producto && form.imageDeleted) {
        await deleteOldImages(producto.id_producto).catch(console.error);
      }

      if (form.imageFile) {
        await uploadImage(saved.id_producto, form.imageFile);
      }

      await qc.invalidateQueries({ queryKey: ['farmer-productos'] });
      onSaved();
    } catch (err: unknown) {
      setGeneralError(
        err instanceof Error ? err.message : 'Error al guardar el producto.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const displayImage = form.imagePreview ?? form.existingImageUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl"
        style={{
          background: surface,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-[18px]"
          style={{ background: brand }}
        >
          <button
            onClick={handleClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border-none text-lg text-white"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            ✕
          </button>
          <span className="text-lg font-bold text-white">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 overflow-y-auto p-6">
          {generalError && (
            <div
              className="rounded-lg px-3.5 py-2.5 text-sm"
              style={{
                background: 'rgba(222,57,58,0.08)',
                border: '1px solid rgba(222,57,58,0.2)',
                color: coral,
              }}
            >
              {generalError}
            </div>
          )}

          {/* Imagen */}
          <div className="flex flex-col items-center gap-2">
            <FormField label="Foto del producto" colors={colors}>
              <></>
            </FormField>
            <div className="relative mt-1">
              <div
                onClick={() => fileRef.current?.click()}
                title="Haz clic para subir o cambiar imagen"
                className="grid h-[140px] w-[140px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl"
                style={{
                  border: displayImage ? 'none' : `2px dashed ${border}`,
                  background: displayImage ? 'transparent' : accentBg,
                }}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    className="h-full w-full object-cover"
                    alt="producto"
                  />
                ) : (
                  <span className="text-4xl">📷</span>
                )}
              </div>
              {displayImage && (
                <button
                  onClick={handleRemoveImage}
                  title="Eliminar imagen"
                  className="absolute -right-2 -top-2 grid h-7 w-7 cursor-pointer place-items-center rounded-full border-none text-sm text-white"
                  style={{
                    background: coral,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {!displayImage && (
              <span className="text-[13px]" style={{ color: muted }}>
                Haz clic para subir una imagen
              </span>
            )}
            {errors.image && (
              <span className="text-xs" style={{ color: coral }}>
                {errors.image}
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Nombre */}
          <Input
            label="Nombre del producto *"
            value={form.nombre_producto}
            onChange={(e) => set('nombre_producto', e.target.value)}
            placeholder="Ej. Tomates frescos"
            error={errors.nombre_producto}
          />

          {/* Descripción */}
          <FormField label="Descripción" colors={colors}>
            <TextArea
              colors={colors}
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Detalles sobre tu producto..."
            />
          </FormField>

          {/* Precio y Stock */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio *"
              value={form.precio}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^.0-9]/g, '');
                const fixed = raw.replace(/\.(?=.*\.)/g, '');
                set('precio', fixed);
              }}
              placeholder="0.00"
              inputMode="decimal"
              error={errors.precio}
            />
            <Input
              label="Stock"
              value={form.stock}
              onChange={(e) =>
                set('stock', e.target.value.replace(/[^0-9]/g, ''))
              }
              placeholder="0"
              inputMode="numeric"
              error={errors.stock}
            />
          </div>

          {/* Perecedero */}
          <label
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3.5 py-2.5"
            style={{ border: `1px solid ${border}`, background: surface }}
          >
            <input
              type="checkbox"
              checked={form.es_perecedero}
              onChange={(e) => set('es_perecedero', e.target.checked)}
              className="h-4 w-4"
              style={{ accentColor: brand }}
            />
            <span className="text-[15px]" style={{ color: fg }}>
              Producto perecedero
            </span>
          </label>

          {/* Categoría y Unidad */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Categoría *"
              error={errors.categoriaId}
              colors={colors}
            >
              <FormSelect
                colors={colors}
                hasError={!!errors.categoriaId}
                value={form.categoriaId ?? ''}
                onChange={(e) =>
                  set(
                    'categoriaId',
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Seleccioná una categoría</option>
                {categories.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField label="Unidad de medida" colors={colors}>
              <FormSelect
                colors={colors}
                value={form.unidadId ?? ''}
                onChange={(e) =>
                  set(
                    'unidadId',
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Seleccioná una unidad</option>
                {unidades.map((u) => (
                  <option key={u.id_unidad} value={u.id_unidad}>
                    {u.tipo}
                  </option>
                ))}
              </FormSelect>
            </FormField>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: `1px solid ${border}` }}
        >
          <Button variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving
              ? 'Guardando…'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear producto'}
          </Button>
        </div>
      </div>
    </div>
  );
}
