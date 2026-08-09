import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_MB } from '../constants/api';
import type { ApiResponse } from '../types';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';
import { FormSelect } from './ui/FormSelect';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import type { useAppColors } from '../hooks/useAppColors';
import api from '../services/api';
import { uploadProductImages } from '../services/productImageUpload';
import { mediaUrl } from '../utils/mediaUrl';

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

// ── Form State ─────────────────────────────────────────────

interface ExistingImage {
  id_imagen: number;
  url: string;
  es_principal: boolean;
}

interface FormState {
  nombre_producto: string;
  descripcion: string;
  precio: string;
  stock: string;
  es_perecedero: boolean;
  categoriaId: number | null;
  unidadId: number | null;
  newImageFiles: File[];
  newImagePreviews: string[];
  existingImages: ExistingImage[];
  imagesToDelete: number[];
}

function extractExistingImages(producto?: Producto): ExistingImage[] {
  if (!producto) return [];

  if (producto.imagenes && producto.imagenes.length > 0) {
    return producto.imagenes.map((img) => ({
      id_imagen: img.id_imagen,
      url: mediaUrl(img.url) ?? img.url,
      es_principal: img.es_principal,
    }));
  }

  const fallback = producto.imagen_principal ?? producto.imagen;
  if (fallback) {
    return [
      {
        id_imagen: 0,
        url: mediaUrl(fallback) ?? fallback,
        es_principal: true,
      },
    ];
  }

  return [];
}

function buildInitialForm(producto?: Producto): FormState {
  return {
    nombre_producto: producto?.nombre_producto ?? '',
    descripcion: producto?.descripcion ?? '',
    precio: producto?.precio ?? '',
    stock: String(producto?.stock ?? 0),
    es_perecedero: producto?.es_perecedero ?? false,
    categoriaId:
      typeof producto?.categoria === 'object' && producto.categoria !== null
        ? producto.categoria.id_categoria
        : (producto?.categoria ?? null),
    unidadId:
      typeof producto?.unidad === 'object' && producto.unidad !== null
        ? producto.unidad.id_unidad
        : (producto?.unidad ?? null),
    newImageFiles: [],
    newImagePreviews: [],
    existingImages: extractExistingImages(producto),
    imagesToDelete: [],
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

async function deleteImages(productId: number, ids: number[]): Promise<void> {
  await Promise.all(
    ids.map((id) =>
      api.delete(`/productos/${productId}/imagen/${id}/`).catch(console.error),
    ),
  );
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
  const { brand, coral, border, surface, fg, accentBg } = colors;
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

  useEffect(() => {
    if (!producto?.id_producto) return;

    let isMounted = true;
    api
      .get<ApiResponse<Producto>>(`/productos/${producto.id_producto}/`)
      .then(({ data }) => {
        if (!isMounted) return;
        const detailedProd = data?.data;
        if (detailedProd) {
          const imgs = extractExistingImages(detailedProd);
          if (imgs.length > 0) {
            setForm((prev) => ({
              ...prev,
              existingImages: imgs,
            }));
          }
        }
      })
      .catch((err: unknown) => {
        console.warn('Error al cargar detalle del producto en web:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [producto?.id_producto]);

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

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const valid: File[] = [];
    for (const f of files) {
      if (f.size > MAX_IMAGE_SIZE_BYTES) {
        setErrors((p) => ({
          ...p,
          images: `"${f.name}" supera ${String(MAX_IMAGE_SIZE_MB)} MB.`,
        }));
        continue;
      }
      if (f.type === 'image/svg+xml') {
        setErrors((p) => ({
          ...p,
          images: `"${f.name}" no es un formato válido.`,
        }));
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;

    const previews = valid.map((f) => URL.createObjectURL(f));
    setForm((p) => ({
      ...p,
      newImageFiles: [...p.newImageFiles, ...valid],
      newImagePreviews: [...p.newImagePreviews, ...previews],
    }));
  }

  function handleRemoveNewImage(index: number) {
    setForm((p) => {
      URL.revokeObjectURL(p.newImagePreviews[index]!);
      const nextFiles = p.newImageFiles.filter((_, i) => i !== index);
      const nextPreviews = p.newImagePreviews.filter((_, i) => i !== index);
      return { ...p, newImageFiles: nextFiles, newImagePreviews: nextPreviews };
    });
  }

  function handleRemoveExistingImage(id: number) {
    setForm((p) => ({
      ...p,
      existingImages: p.existingImages.filter((img) => img.id_imagen !== id),
      imagesToDelete: [...p.imagesToDelete, id],
    }));
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

      if (form.imagesToDelete.length > 0) {
        await deleteImages(saved.id_producto, form.imagesToDelete).catch(
          console.error,
        );
      }

      if (form.newImageFiles.length > 0) {
        try {
          await uploadProductImages(saved.id_producto, form.newImageFiles);
        } catch (imgErr) {
          setGeneralError(
            imgErr instanceof Error
              ? `Producto guardado, pero algunas imágenes no se subieron: ${imgErr.message}`
              : 'Producto guardado, pero no se pudieron subir las imágenes.',
          );
          return;
        }
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

          {/* Imágenes */}
          <div className="flex flex-col gap-2">
            <FormField label="Imágenes del producto" colors={colors}>
              <></>
            </FormField>

            <div className="grid grid-cols-3 gap-2">
              {form.existingImages.map((img) => (
                <div key={img.id_imagen} className="relative">
                  <div
                    className="h-24 w-full overflow-hidden rounded-xl"
                    style={{ background: accentBg }}
                  >
                    <img
                      src={img.url}
                      className="h-full w-full object-cover"
                      alt=""
                    />
                  </div>
                  <span className="absolute left-1 top-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                    {img.es_principal ? 'Principal' : ''}
                  </span>
                  <button
                    onClick={() => handleRemoveExistingImage(img.id_imagen)}
                    title="Eliminar imagen"
                    className="absolute -right-1.5 -top-1.5 grid h-6 w-6 cursor-pointer place-items-center rounded-full border-none text-[11px] text-white"
                    style={{
                      background: coral,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {form.newImagePreviews.map((preview, i) => (
                <div key={`new-${i}`} className="relative">
                  <div
                    className="h-24 w-full overflow-hidden rounded-xl"
                    style={{ background: accentBg }}
                  >
                    <img
                      src={preview}
                      className="h-full w-full object-cover"
                      alt=""
                    />
                  </div>
                  <span className="absolute left-1 top-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                    {form.existingImages.length === 0 && i === 0
                      ? 'Principal'
                      : ''}
                  </span>
                  <button
                    onClick={() => handleRemoveNewImage(i)}
                    title="Eliminar imagen"
                    className="absolute -right-1.5 -top-1.5 grid h-6 w-6 cursor-pointer place-items-center rounded-full border-none text-[11px] text-white"
                    style={{
                      background: coral,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div
                onClick={() => fileRef.current?.click()}
                title="Agregar imágenes"
                className="flex h-24 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed"
                style={{ borderColor: border, background: accentBg }}
              >
                <span className="text-2xl">📷</span>
              </div>
            </div>

            {errors.images && (
              <span className="text-xs" style={{ color: coral }}>
                {errors.images}
              </span>
            )}

            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFilesSelected}
            />
          </div>

          {/* Nombre */}
          <Input
            colors={colors}
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
              colors={colors}
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
              colors={colors}
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
                {Array.isArray(categories) &&
                  categories.map((c) => (
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
                {Array.isArray(unidades) &&
                  unidades.map((u) => (
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
