import { useCallback, useRef, useState } from 'react';

import type { Producto } from '@/services/productos';
import { uploadProductoSemanalImagen } from '@/services/publications';
import type { ProductoSemanal, Publicacion } from '@/services/publications';

import {
  useAddProductoSemanal,
  useCreatePublicacion,
  useDeleteProductoSemanal,
  useDeletePublicacion,
  usePublishPublicacion,
  useUpdateProductoSemanal,
} from './usePublications';

export type WizardStep = 'fecha' | 'productos' | 'resumen' | 'publicar';

export const WIZARD_STEPS: WizardStep[] = [
  'fecha',
  'productos',
  'resumen',
  'publicar',
];

export type WizardItemField = 'fk_unidad' | 'stock' | 'precio' | 'foto';

export interface WizardItemDraft {
  tempId: string;
  fk_producto: number;
  fk_unidad: number;
  stock: string;
  precio: string;
  foto: string | null;
}

export interface WizardItemValidation {
  stock?: string;
  precio?: string;
  fk_unidad?: string;
  foto?: string;
}

interface UsePublicationWizardParams {
  publicacion: Publicacion | undefined;
  productos: ProductoSemanal[];
}

interface UsePublicationWizardResult {
  currentStep: WizardStep;
  stepIndex: number;
  items: WizardItemDraft[];
  itemValidations: Map<string, WizardItemValidation>;
  hasItemErrors: boolean;
  isCreating: boolean;
  isPublishing: boolean;
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  addItem: (producto: Producto) => void;
  removeItem: (tempId: string) => void;
  updateItem: (
    tempId: string,
    field: WizardItemField,
    value: string | number | null,
  ) => void;
  validateItems: () => boolean;
  publish: () => Promise<void>;
  saveDraft: () => Promise<void>;
}

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function validateItem(item: WizardItemDraft): WizardItemValidation {
  const errors: WizardItemValidation = {};

  const stockNum = Number(item.stock);
  if (!item.stock || Number.isNaN(stockNum) || stockNum <= 0) {
    errors.stock = 'El stock debe ser un número mayor a 0.';
  }

  const precioNum = Number(item.precio);
  if (!item.precio || Number.isNaN(precioNum) || precioNum <= 0) {
    errors.precio = 'El precio debe ser un número mayor a 0.';
  }

  if (!item.fk_unidad) {
    errors.fk_unidad = 'Selecciona una unidad.';
  }
  if (!item.foto || item.foto.trim() === '') {
    errors.foto = 'La foto es requerida.';
  }

  return errors;
}

function isLocalFileUri(uri: string): boolean {
  return uri.startsWith('file://');
}

async function uploadLocalPhoto(
  pubId: number,
  itemId: number,
  fotoUri: string,
): Promise<void> {
  const formData = new FormData();
  const filename = fotoUri.split('/').pop() ?? 'photo.jpg';
  const ext = filename.split('.').pop() ?? 'jpg';
  formData.append('imagen', {
    uri: fotoUri,
    name: filename,
    type: `image/${ext}`,
  } as unknown as Blob);
  await uploadProductoSemanalImagen(pubId, itemId, formData);
}

type MutateAsyncFn = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack mutation types are complex; any is the pragmatic choice here
  vars: any,
) => Promise<{ data: { id_producto_semanal: number } }>;

interface PersistResult {
  itemId: number;
  isNew: boolean;
}

async function persistItem(
  pubId: number,
  item: WizardItemDraft,
  existingItems: ProductoSemanal[],
  addMutateAsync: MutateAsyncFn,
  updateMutateAsync: MutateAsyncFn,
): Promise<PersistResult> {
  const isExisting = existingItems.some(
    (p) => String(p.id_producto_semanal) === item.tempId,
  );

  const payload = {
    fk_producto: item.fk_producto,
    fk_unidad: item.fk_unidad,
    stock: Number(item.stock),
    precio: Number(item.precio),
    foto: isLocalFileUri(item.foto ?? '') ? null : item.foto,
  };

  let itemId: number;

  if (isExisting) {
    const result = await updateMutateAsync({
      pubId,
      itemId: Number(item.tempId),
      payload,
    });
    itemId = result.data.id_producto_semanal;
  } else {
    const result = await addMutateAsync({ pubId, payload });
    itemId = result.data.id_producto_semanal;
  }

  if (item.foto && isLocalFileUri(item.foto)) {
    await uploadLocalPhoto(pubId, itemId, item.foto);
  }

  return { itemId, isNew: !isExisting };
}

export function usePublicationWizard({
  publicacion,
  productos,
}: UsePublicationWizardParams): UsePublicationWizardResult {
  const [stepIndex, setStepIndex] = useState(0);
  const publicationRef = useRef(publicacion);
  publicationRef.current = publicacion;
  const publishingRef = useRef(false);

  const createMutation = useCreatePublicacion();
  const deletePublicationMutation = useDeletePublicacion();
  const publishMutation = usePublishPublicacion();
  const addItemMutation = useAddProductoSemanal();
  const updateItemMutation = useUpdateProductoSemanal();
  const removeItemMutation = useDeleteProductoSemanal();

  const items: WizardItemDraft[] = productos.map((p) => ({
    tempId: String(p.id_producto_semanal),
    fk_producto: p.fk_producto,
    fk_unidad: p.fk_unidad,
    stock: String(p.stock),
    precio: p.precio,
    foto: p.foto,
  }));

  const [localItems, setLocalItems] = useState<WizardItemDraft[]>([]);
  const [localItemsInitialized, setLocalItemsInitialized] = useState(false);
  const [itemValidations, setItemValidations] = useState<
    Map<string, WizardItemValidation>
  >(new Map());

  // Initialize localItems from server data when editing an existing publication
  if (publicacion && !localItemsInitialized && items.length > 0) {
    setLocalItems(items);
    setLocalItemsInitialized(true);
  }

  const activeItems = localItems;

  const currentStep = WIZARD_STEPS[stepIndex] ?? 'fecha';

  const goToStep = useCallback((step: WizardStep) => {
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx >= 0) setStepIndex(idx);
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex < WIZARD_STEPS.length - 1) {
      setStepIndex((prev) => prev + 1);
    }
  }, [stepIndex]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  }, [stepIndex]);

  const addItem = useCallback((producto: Producto) => {
    const newItem: WizardItemDraft = {
      tempId: generateTempId(),
      fk_producto: producto.id_producto,
      fk_unidad: 0,
      stock: '',
      precio: '',
      foto: null,
    };
    setLocalItems((prev) => [...prev, newItem]);
  }, []);

  const removeItem = useCallback((tempId: string) => {
    setLocalItems((prev) => prev.filter((i) => i.tempId !== tempId));
    setItemValidations((prev) => {
      const next = new Map(prev);
      next.delete(tempId);
      return next;
    });
  }, []);

  const updateItem = useCallback(
    (tempId: string, field: WizardItemField, value: string | number | null) => {
      setLocalItems((prev) =>
        prev.map((i) => (i.tempId === tempId ? { ...i, [field]: value } : i)),
      );
      setItemValidations((prev) => {
        const next = new Map(prev);
        next.delete(tempId);
        return next;
      });
    },
    [],
  );

  const validateItems = useCallback((): boolean => {
    const validations = new Map<string, WizardItemValidation>();
    let hasError = false;

    for (const item of activeItems) {
      const errors = validateItem(item);
      if (Object.keys(errors).length > 0) {
        validations.set(item.tempId, errors);
        hasError = true;
      }
    }

    setItemValidations(validations);
    return !hasError;
  }, [activeItems]);

  const ensurePublicationAndPersist = useCallback(async (): Promise<
    Publicacion | undefined
  > => {
    let pub = publicationRef.current;
    let autoCreatedPub = false;

    if (!pub) {
      const result = await createMutation.mutateAsync();
      pub = result.data;
      publicationRef.current = pub;
      autoCreatedPub = true;
    }

    if (!pub) return undefined;

    const createdIds: number[] = [];

    try {
      for (const item of activeItems) {
        const result = await persistItem(
          pub.id_publicacion,
          item,
          productos,
          addItemMutation.mutateAsync,
          updateItemMutation.mutateAsync,
        );
        if (result.isNew) {
          createdIds.push(result.itemId);
        }
      }
    } catch (error) {
      for (const id of createdIds) {
        try {
          await removeItemMutation.mutateAsync({
            pubId: pub.id_publicacion,
            itemId: id,
          });
        } catch {
          // Best-effort cleanup
        }
      }
      if (autoCreatedPub) {
        try {
          await deletePublicationMutation.mutateAsync(pub.id_publicacion);
          publicationRef.current = undefined;
        } catch {
          // Best-effort cleanup
        }
      }
      throw error;
    }

    return pub;
  }, [
    activeItems,
    productos,
    createMutation,
    deletePublicationMutation,
    addItemMutation,
    updateItemMutation,
    removeItemMutation,
  ]);

  const publish = useCallback(async () => {
    if (publishingRef.current) return;
    publishingRef.current = true;

    try {
      const pub = await ensurePublicationAndPersist();
      if (!pub) return;

      const existingIds = new Set(
        productos.map((p) => String(p.id_producto_semanal)),
      );
      const currentIds = new Set(activeItems.map((i) => i.tempId));

      for (const id of existingIds) {
        if (!currentIds.has(id)) {
          try {
            await removeItemMutation.mutateAsync({
              pubId: pub.id_publicacion,
              itemId: Number(id),
            });
          } catch {
            // Best-effort cleanup
          }
        }
      }

      await publishMutation.mutateAsync(pub.id_publicacion);
    } finally {
      publishingRef.current = false;
    }
  }, [
    activeItems,
    productos,
    ensurePublicationAndPersist,
    removeItemMutation,
    publishMutation,
  ]);

  const saveDraft = useCallback(async () => {
    if (publishingRef.current) return;
    publishingRef.current = true;

    try {
      await ensurePublicationAndPersist();
    } finally {
      publishingRef.current = false;
    }
  }, [ensurePublicationAndPersist]);

  return {
    currentStep,
    stepIndex,
    items: activeItems,
    itemValidations,
    hasItemErrors: itemValidations.size > 0,
    isCreating: createMutation.isPending,
    isPublishing:
      publishMutation.isPending ||
      addItemMutation.isPending ||
      updateItemMutation.isPending ||
      removeItemMutation.isPending,
    goToStep,
    nextStep,
    prevStep,
    addItem,
    removeItem,
    updateItem,
    validateItems,
    publish,
    saveDraft,
  };
}
