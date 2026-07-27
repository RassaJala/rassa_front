import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useAppColors } from "../hooks/useAppColors";
import {
  useAddProductoSemanal,
  useCatalogProductos,
  useCreatePublicacion,
  useDeleteProductoSemanal,
  useProductosSemanales,
  usePublicacion,
  usePublishPublicacion,
  useUnidades,
  useUpdateProductoSemanal,
  useUploadProductoSemanalImagen,
} from "../hooks/usePublications";
import { getPublicacion, type Producto } from "../services/publications";
import {
  type ItemValidation,
  type WizardItemDraft,
  canJumpToStep,
  formatDate,
  generateTempId,
  getNextMonday,
  getWeekNumber,
  validateAllItems as validateAllItemsPure,
  validateItem,
} from "../utils/publicationWizard";
import { extractApiError } from "../utils/apiError";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
} from "../constants/api";
import { mediaUrl } from "../utils/mediaUrl";
import { ProductPickerModal } from "../components/ProductPickerModal";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { FormField } from "../components/ui/FormField";
import { FormSelect } from "../components/ui/FormSelect";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Toast, type ToastState } from "../components/ui/Toast";

// ── Types ──────────────────────────────────────────────────

type WizardStep = "fecha" | "productos" | "resumen" | "publicar";

const WIZARD_STEPS: WizardStep[] = [
  "fecha",
  "productos",
  "resumen",
  "publicar",
];

const STEP_LABELS: Record<WizardStep, string> = {
  fecha: "Fecha",
  productos: "Productos",
  resumen: "Resumen",
  publicar: "Publicar",
};

// ── PublicationWizard ──────────────────────────────────────

export function PublicationWizard() {
  const colors = useAppColors();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const pubId = isEditing ? Number(id) : 0;
  const invalidId = isEditing && (Number.isNaN(pubId) || pubId <= 0);

  // ── Step state ──
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = WIZARD_STEPS[stepIndex] ?? "fecha";

  // ── Items ──
  const [items, setItems] = useState<WizardItemDraft[]>([]);
  const [validations, setValidations] = useState<Map<string, ItemValidation>>(
    new Map(),
  );

  // ── Hooks (all data via TanStack Query) ──
  const catalogQuery = useCatalogProductos();
  const unidadesQuery = useUnidades();
  const pubQuery = usePublicacion(pubId);
  const itemsQuery = useProductosSemanales(pubId);

  const createMutation = useCreatePublicacion();
  const publishMutation = usePublishPublicacion();
  const addItemMutation = useAddProductoSemanal();
  const updateItemMutation = useUpdateProductoSemanal();
  const removeItemMutation = useDeleteProductoSemanal();
  const uploadMutation = useUploadProductoSemanalImagen();

  // ── UI state ──
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const pubRef = useRef<import("../services/publications").Publicacion | null>(
    null,
  );
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // ── Initialize items from server data (editing mode) ──
  const [itemsInitialized, setItemsInitialized] = useState(false);

  useEffect(() => {
    if (!isEditing || itemsInitialized) return;
    if (pubQuery.data && itemsQuery.data && catalogQuery.data) {
      const pub = pubQuery.data.data;
      pubRef.current = pub;

      const catalog = catalogQuery.data?.data?.results ?? [];
      const catalogMap = new Map(
        catalog.map((p) => [p.id_producto, p.nombre_producto]),
      );

      const existingItems: WizardItemDraft[] = (
        itemsQuery.data?.data ?? []
      ).map((p) => ({
        tempId: String(p.id_producto_semanal),
        fk_producto: p.fk_producto,
        nombre_producto: catalogMap.get(p.fk_producto) ?? "",
        fk_unidad: p.fk_unidad,
        stock: String(p.stock),
        precio: p.precio,
        foto: p.foto,
        imageFile: null,
        imagePreview: null,
      }));
      setItems(existingItems);
      setItemsInitialized(true);
    }
  }, [
    isEditing,
    itemsInitialized,
    pubQuery.data,
    itemsQuery.data,
    catalogQuery.data,
  ]);

  // ── Cleanup on unmount ──
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      for (const item of itemsRef.current) {
        if (item.imagePreview) URL.revokeObjectURL(item.imagePreview);
      }
    };
  }, []);

  // ── Date helpers ──
  const pubData = isEditing ? pubQuery.data?.data : undefined;
  const nextMonday =
    isEditing && pubData
      ? new Date(pubData.fecha_publicacion)
      : getNextMonday();
  const weekNumber =
    isEditing && pubData ? pubData.semana : getWeekNumber(nextMonday);

  // ── Navigation ──
  function nextStep() {
    if (currentStep === "productos" && !validateAndMarkItems()) return;
    setStepIndex((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }

  function prevStep() {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }

  function jumpToStep(idx: number) {
    if (!canJumpToStep(idx, stepIndex, WIZARD_STEPS, items)) return;
    setStepIndex(idx);
  }

  // ── Items CRUD ──
  function addItem(producto: Producto) {
    const already = items.some((i) => i.fk_producto === producto.id_producto);
    if (already) return;

    const newItem: WizardItemDraft = {
      tempId: generateTempId(),
      fk_producto: producto.id_producto,
      nombre_producto: producto.nombre_producto,
      fk_unidad: 0,
      stock: "",
      precio: String(producto.precio),
      foto: null,
      imageFile: null,
      imagePreview: null,
    };
    setItems((prev) => [...prev, newItem]);
  }

  function removeItem(tempId: string) {
    // Revoke blob URL if it exists
    const item = items.find((i) => i.tempId === tempId);
    if (item?.imagePreview) URL.revokeObjectURL(item.imagePreview);

    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
    setValidations((prev) => {
      const next = new Map(prev);
      next.delete(tempId);
      return next;
    });
  }

  function updateItem(
    tempId: string,
    field: keyof WizardItemDraft,
    value: string | number | null,
  ) {
    setItems((prev) =>
      prev.map((i) => (i.tempId === tempId ? { ...i, [field]: value } : i)),
    );
    setValidations((prev) => {
      const next = new Map(prev);
      next.delete(tempId);
      return next;
    });
  }

  function validateAndMarkItems(): boolean {
    const validationResults = new Map<string, ItemValidation>();
    let hasError = false;
    for (const item of items) {
      const errs = validateItem(item);
      if (Object.keys(errs).length > 0) {
        validationResults.set(item.tempId, errs);
        hasError = true;
      }
    }
    setValidations(validationResults);
    return !hasError;
  }

  // ── Image handling ──
  function handleImageSelect(tempId: string, file: File) {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`La imagen no puede superar ${String(MAX_IMAGE_SIZE_MB)} MB.`);
      return;
    }

    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError("Formato de imagen no válido. Usá JPG, PNG, WebP o GIF.");
      return;
    }

    // Revoke previous blob URL if replacing
    const prev = items.find((i) => i.tempId === tempId);
    if (prev?.imagePreview) URL.revokeObjectURL(prev.imagePreview);

    const preview = URL.createObjectURL(file);
    setItems((prevItems) =>
      prevItems.map((i) =>
        i.tempId === tempId
          ? { ...i, imageFile: file, imagePreview: preview }
          : i,
      ),
    );
  }

  function handleImageRemove(tempId: string) {
    const item = items.find((i) => i.tempId === tempId);
    if (item?.imagePreview) URL.revokeObjectURL(item.imagePreview);

    setItems((prev) =>
      prev.map((i) =>
        i.tempId === tempId ? { ...i, imageFile: null, imagePreview: null } : i,
      ),
    );
  }

  // ── Phase 1: Upsert items ──
  async function upsertItems(
    pubNumber: number,
    signal?: AbortSignal,
  ): Promise<{
    tempIdToServerId: Map<string, number>;
    newServerIds: number[];
  }> {
    const newServerIds: number[] = [];
    const tempIdToServerId = new Map<string, number>();

    for (const item of items) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      const serverId = Number(item.tempId);
      const isExisting =
        !Number.isNaN(serverId) && serverId > 0 && pubRef.current !== null;

      const payload = {
        fk_producto: item.fk_producto,
        fk_unidad: item.fk_unidad,
        stock: Number(item.stock),
        precio: Number(item.precio),
      };

      let itemId: number;

      if (isExisting) {
        const result = await updateItemMutation.mutateAsync({
          pubId: pubNumber,
          itemId: serverId,
          payload,
        });
        itemId = result.data.id_producto_semanal;
      } else {
        const result = await addItemMutation.mutateAsync({
          pubId: pubNumber,
          payload,
        });
        itemId = result.data.id_producto_semanal;
        newServerIds.push(itemId);
      }

      tempIdToServerId.set(item.tempId, itemId);
      setItems((prev) =>
        prev.map((i) =>
          i.tempId === item.tempId ? { ...i, tempId: String(itemId) } : i,
        ),
      );

      if (item.imageFile) {
        if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
        const formData = new FormData();
        formData.append("imagen", item.imageFile);
        await uploadMutation.mutateAsync({
          pubId: pubNumber,
          itemId,
          formData,
        });
      }
    }

    return { tempIdToServerId, newServerIds };
  }

  // ── Phase 2: Refresh pubRef snapshot ──
  async function refreshSnapshot(pubNumber: number): Promise<void> {
    const refreshed = await qc.fetchQuery({
      queryKey: ["publicaciones", pubNumber],
      queryFn: () => getPublicacion(pubNumber),
      staleTime: 0,
    });
    pubRef.current = refreshed.data;
  }

  // ── Phase 3: Delete orphan items ──
  async function deleteOrphans(
    pubNumber: number,
    tempIdToServerId: Map<string, number>,
    signal?: AbortSignal,
  ): Promise<void> {
    const currentIds = new Set<string>(
      [...tempIdToServerId.values()].map(String),
    );
    for (const item of items) {
      const syncedId = tempIdToServerId.get(item.tempId);
      if (syncedId !== undefined) {
        currentIds.add(String(syncedId));
      } else {
        const parsed = Number(item.tempId);
        if (!Number.isNaN(parsed) && parsed > 0) currentIds.add(String(parsed));
      }
    }
    for (const existing of pubRef.current.productos) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      const existingId = String(existing.id_producto_semanal);
      if (!currentIds.has(existingId)) {
        await removeItemMutation.mutateAsync({
          pubId: pubNumber,
          itemId: existing.id_producto_semanal,
        });
      }
    }
  }

  // ── Persist items to server (with rollback) ──
  async function persistItems(
    pubNumber: number,
    signal?: AbortSignal,
  ): Promise<void> {
    let newServerIds: number[] = [];
    try {
      const { tempIdToServerId, newServerIds: ids } = await upsertItems(
        pubNumber,
        signal,
      );
      newServerIds = ids;

      await refreshSnapshot(pubNumber);
      await deleteOrphans(pubNumber, tempIdToServerId, signal);
    } catch (err) {
      if (newServerIds.length > 0) {
        for (const serverId of newServerIds) {
          try {
            await removeItemMutation.mutateAsync({
              pubId: pubNumber,
              itemId: serverId,
            });
          } catch (cleanupErr) {
            console.error(
              "[publications] rollback cleanup failed for item",
              serverId,
              cleanupErr,
            );
          }
        }
      }
      throw err;
    }
  }

  // ── Shared persist orchestration ──
  async function runPersist(opts: {
    successMsg: string;
    afterPersist?: (pubId: number) => Promise<void>;
  }): Promise<void> {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let pub = pubRef.current;
      if (!pub) {
        const result = await createMutation.mutateAsync();
        pub = result.data;
        pubRef.current = pub;
      }
      if (!pub) {
        if (mountedRef.current) {
          setError("No se pudo crear la publicación.");
        }
        return;
      }

      await persistItems(pub.id_publicacion, controller.signal);
      await opts.afterPersist?.(pub.id_publicacion);

      if (mountedRef.current) {
        setToast({ message: opts.successMsg, type: "success" });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("[publications] persist failed:", err);
      if (mountedRef.current) {
        setError(extractApiError(err, ["detail", "message"]));
      }
    } finally {
      abortRef.current = null;
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }

  // ── Save draft ──
  function handleSaveDraft() {
    void runPersist({ successMsg: "Borrador guardado." });
  }

  // ── Publish ──
  function handlePublish() {
    void runPersist({
      successMsg: "¡Publicación publicada!",
      afterPersist: async (pubId) => {
        await publishMutation.mutateAsync(pubId);
        if (mountedRef.current) void navigate("/agricultor/publicaciones");
      },
    });
  }

  // ── Toast ──
  const [toast, setToast] = useState<ToastState | null>(null);

  // ── Loading state ──
  if (invalidId) {
    return (
      <div className="py-12 text-center">
        <p className="mb-3" style={{ color: colors.coral }}>
          ID de publicación inválido.
        </p>
        <Button
          variant="secondary"
          onClick={() => void navigate("/agricultor/publicaciones")}
        >
          Volver
        </Button>
      </div>
    );
  }

  if (isEditing && (pubQuery.isLoading || itemsQuery.isLoading)) {
    return <LoadingSpinner className="py-20" />;
  }

  if (isEditing && (pubQuery.isError || itemsQuery.isError)) {
    return (
      <div className="py-12 text-center">
        <p className="mb-3" style={{ color: colors.coral }}>
          {itemsQuery.isError
            ? "No se pudieron cargar los productos de la publicación."
            : "No se pudo cargar la publicación."}
        </p>
        <Button
          variant="secondary"
          onClick={() => void navigate("/agricultor/publicaciones")}
        >
          Volver
        </Button>
      </div>
    );
  }

  const catalog = catalogQuery.data?.data?.results ?? [];
  const unidades = unidadesQuery.data?.data ?? [];
  const loadingCatalog = catalogQuery.isLoading || unidadesQuery.isLoading;
  const selectedIds = new Set(items.map((i) => i.fk_producto));
  const hasItemErrors = !validateAllItemsPure(items);

  return (
    <div className="relative mx-auto max-w-3xl">
      {/* Toast */}
      <Toast toast={toast} onDone={() => setToast(null)} />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.fg }}>
            {isEditing
              ? `Editar Publicación — Semana ${weekNumber}`
              : `Nueva Publicación — Semana ${weekNumber}`}
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: colors.muted }}>
            {formatDate(nextMonday)}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => void navigate("/agricultor/publicaciones")}
        >
          ✕ Cerrar
        </Button>
      </div>

      {/* Step indicator */}
      <div
        className="mb-6 flex gap-1 p-1"
        style={{
          background: colors.bg,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
        }}
      >
        {WIZARD_STEPS.map((step, idx) => {
          const isActive = idx === stepIndex;
          const isDone = idx < stepIndex;
          return (
            <button
              key={step}
              onClick={() => jumpToStep(idx)}
              className="flex-1 cursor-pointer px-3 py-2.5 font-[inherit] text-[13px] font-semibold"
              style={{
                borderRadius: 10,
                border: "none",
                background: isActive ? colors.surface : "transparent",
                color: isActive
                  ? colors.fg
                  : isDone
                    ? colors.brand
                    : colors.muted,
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {isDone ? "✓ " : ""}
              {STEP_LABELS[step]}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-4 rounded-xl px-4 py-3 text-[14px]"
          style={{
            background: "rgba(222,57,58,0.08)",
            border: "1px solid rgba(222,57,58,0.2)",
            color: colors.coral,
          }}
        >
          {error}
        </div>
      )}

      {/* Step content */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Step 1: Fecha */}
        {currentStep === "fecha" && (
          <div>
            <h2
              className="mb-4 text-xl font-semibold"
              style={{ color: colors.fg }}
            >
              Fecha de publicación
            </h2>
            <div
              className="rounded-xl p-5"
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
              }}
            >
              <p
                className="text-[15px] font-semibold"
                style={{ color: colors.fg }}
              >
                Semana {weekNumber}
              </p>
              <p
                className="mt-1 text-[14px] capitalize"
                style={{ color: colors.muted }}
              >
                {formatDate(nextMonday)}
              </p>
              <p className="mt-3 text-[13px]" style={{ color: colors.muted }}>
                La publicación correspondirá a esta semana. Los productos que
                agregues en el siguiente paso estarán disponibles para los
                compradores.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Productos */}
        {currentStep === "productos" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2
                className="text-xl font-semibold"
                style={{ color: colors.fg }}
              >
                Productos ({items.length})
              </h2>
              <Button variant="secondary" onClick={() => setShowPicker(true)}>
                + Agregar producto
              </Button>
            </div>

            {loadingCatalog ? (
              <LoadingSpinner className="py-8" />
            ) : items.length === 0 ? (
              <EmptyState
                icon="📦"
                title="No hay productos"
                message="Agregá productos para tu publicación semanal."
                action={
                  <Button variant="primary" onClick={() => setShowPicker(true)}>
                    + Agregar producto
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {items.map((item) => {
                  const errs = validations.get(item.tempId) ?? {};
                  const displayImage = item.imagePreview ?? mediaUrl(item.foto);
                  return (
                    <div
                      key={item.tempId}
                      className="rounded-xl p-4"
                      style={{
                        border: `1px solid ${colors.border}`,
                        background: colors.surface,
                      }}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p
                          className="text-[15px] font-semibold"
                          style={{ color: colors.fg }}
                        >
                          {item.nombre_producto ||
                            `Producto #${String(item.fk_producto)}`}
                        </p>
                        <button
                          onClick={() => removeItem(item.tempId)}
                          className="cursor-pointer border-none bg-transparent text-[16px]"
                          style={{ color: colors.coral }}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex gap-3">
                        {/* Image */}
                        <div className="shrink-0">
                          <div
                            className="relative grid h-20 w-20 cursor-pointer place-items-center overflow-hidden rounded-xl"
                            style={{
                              border: displayImage
                                ? "none"
                                : `2px dashed ${colors.inputBorder}`,
                              background: displayImage
                                ? "transparent"
                                : colors.accentBg,
                            }}
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/*";
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement)
                                  .files?.[0];
                                if (file) handleImageSelect(item.tempId, file);
                              };
                              input.click();
                            }}
                          >
                            {displayImage ? (
                              <img
                                src={displayImage}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              <span className="text-2xl">📷</span>
                            )}
                          </div>
                          {displayImage && (
                            <button
                              onClick={() => handleImageRemove(item.tempId)}
                              className="relative -mt-2 ml-16 grid h-5 w-5 cursor-pointer place-items-center rounded-full border-none text-[11px]"
                              style={{
                                background: colors.coral,
                                color: "#fff",
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Fields */}
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <FormField
                                label="Stock *"
                                error={errs.stock}
                                colors={colors}
                              >
                                <Input
                                  colors={colors}
                                  type="number"
                                  min="0"
                                  value={item.stock}
                                  onChange={(e) =>
                                    updateItem(
                                      item.tempId,
                                      "stock",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0"
                                />
                              </FormField>
                            </div>
                            <div className="flex-1">
                              <FormField
                                label="Precio *"
                                error={errs.precio}
                                colors={colors}
                              >
                                <Input
                                  colors={colors}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.precio}
                                  onChange={(e) =>
                                    updateItem(
                                      item.tempId,
                                      "precio",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0.00"
                                />
                              </FormField>
                            </div>
                          </div>
                          <FormField
                            label="Unidad *"
                            error={errs.fk_unidad}
                            colors={colors}
                          >
                            <FormSelect
                              colors={colors}
                              hasError={!!errs.fk_unidad}
                              value={item.fk_unidad || ""}
                              onChange={(e) =>
                                updateItem(
                                  item.tempId,
                                  "fk_unidad",
                                  Number(e.target.value),
                                )
                              }
                            >
                              <option value="">Seleccionar unidad</option>
                              {unidades.map((u) => (
                                <option key={u.id_unidad} value={u.id_unidad}>
                                  {u.tipo}
                                </option>
                              ))}
                            </FormSelect>
                          </FormField>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Resumen */}
        {currentStep === "resumen" && (
          <div>
            <h2
              className="mb-4 text-xl font-semibold"
              style={{ color: colors.fg }}
            >
              Resumen
            </h2>
            <div
              className="mb-4 rounded-xl p-4"
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
              }}
            >
              <p className="text-[14px]" style={{ color: colors.muted }}>
                Semana {weekNumber} — {formatDate(nextMonday)}
              </p>
              <p
                className="mt-1 text-[15px] font-semibold"
                style={{ color: colors.fg }}
              >
                {items.length} producto{items.length !== 1 ? "s" : ""} en la
                publicación
              </p>
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon="📦"
                title="Sin productos"
                message="Agregá productos en el paso anterior."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const unidad = unidades.find(
                    (u) => u.id_unidad === item.fk_unidad,
                  );
                  const displayImage = item.imagePreview ?? mediaUrl(item.foto);
                  return (
                    <div
                      key={item.tempId}
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{
                        border: `1px solid ${colors.border}`,
                        background: colors.surface,
                      }}
                    >
                      <div
                        className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg"
                        style={{ background: colors.accentBg }}
                      >
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <span className="text-lg">🌿</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[14px] font-semibold"
                          style={{ color: colors.fg }}
                        >
                          {item.nombre_producto ||
                            `Producto #${String(item.fk_producto)}`}
                        </p>
                        <p
                          className="text-[13px]"
                          style={{ color: colors.muted }}
                        >
                          {item.stock} {unidad?.tipo ?? ""} · ${item.precio}
                        </p>
                      </div>
                      <Badge
                        variant={
                          item.foto || item.imageFile ? "success" : "warning"
                        }
                      >
                        {item.foto || item.imageFile ? "Con foto" : "Sin foto"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Publicar */}
        {currentStep === "publicar" && (
          <div>
            <h2
              className="mb-4 text-xl font-semibold"
              style={{ color: colors.fg }}
            >
              Publicar
            </h2>
            <div
              className="rounded-xl p-5 text-center"
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
              }}
            >
              <p className="mb-2 text-[40px]">🚀</p>
              <p
                className="text-[15px] font-semibold"
                style={{ color: colors.fg }}
              >
                ¿Publicar la semana {weekNumber}?
              </p>
              <p className="mt-1 text-[14px]" style={{ color: colors.muted }}>
                {items.length} producto{items.length !== 1 ? "s" : ""} serán
                publicados y visibles para los compradores.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div
        className="mt-4 flex items-center justify-between rounded-2xl px-6 py-4"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div>
          {stepIndex > 0 && (
            <Button variant="ghost" onClick={prevStep}>
              ← Anterior
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep === "publicar" ? (
            <>
              <Button
                variant="secondary"
                onClick={() => void handleSaveDraft()}
                disabled={saving || items.length === 0 || hasItemErrors}
              >
                {saving ? "Guardando…" : "Guardar borrador"}
              </Button>
              <Button
                variant="primary"
                onClick={() => void handlePublish()}
                disabled={saving || items.length === 0 || hasItemErrors}
              >
                {saving ? "Publicando…" : "🚀 Publicar"}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={nextStep}
              disabled={currentStep === "productos" && items.length === 0}
            >
              Siguiente →
            </Button>
          )}
        </div>
      </div>

      {/* Product picker modal */}
      {showPicker && (
        <ProductPickerModal
          catalog={catalog}
          selectedIds={selectedIds}
          onSelect={addItem}
          onClose={() => setShowPicker(false)}
          colors={colors}
        />
      )}
    </div>
  );
}
