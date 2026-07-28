import { useCallback, useEffect, useRef, useState } from 'react';

import type { Producto } from '@/services/productos';
import { uploadProductoSemanalImagen } from '@/services/publications';
import type { ProductoSemanal, Publicacion } from '@/services/publications';
import { buildImageFormData } from '@/utils/uploadImage';

import {
  useAddProductoSemanal,
  useCreatePublicacion,
  useDeleteProductoSemanal,
  useDeletePublicacion,
  usePublishPublicacion,
  useUpdateProductoSemanal,
} from './usePublications';

function logDev(...args: unknown[]): void {
  if (__DEV__) {
    console.error(...args);
  }
}

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

export function generateLocalTempId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function validateItem(item: WizardItemDraft): WizardItemValidation {
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

export function isLocalFileUri(uri: string): boolean {
  return uri.startsWith('file://');
}

async function uploadLocalPhoto(
  pubId: number,
  itemId: number,
  fotoUri: string,
): Promise<void> {
  const formData = buildImageFormData(fotoUri);
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

function isValidItemId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

function buildPayload(item: WizardItemDraft) {
  const stockNum = Number(item.stock);
  const precioNum = Number(item.precio);
  return {
    fk_producto: item.fk_producto,
    fk_unidad: item.fk_unidad,
    stock: Number.isNaN(stockNum) ? 0 : stockNum,
    precio: Number.isNaN(precioNum) ? 0 : precioNum,
    foto: isLocalFileUri(item.foto ?? '') ? null : item.foto,
  };
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

  const payload = buildPayload(item);

  let itemId: number;

  if (isExisting) {
    const serverId = Number(item.tempId);
    if (!isValidItemId(serverId)) {
      throw new Error(
        `[usePublicationWizard] Invalid server id for update: ${item.tempId}`,
      );
    }
    const result = await updateMutateAsync({
      pubId,
      itemId: serverId,
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

const PUBLISH_TIMEOUT_MS = 60_000;

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `La operación tardó más de ${String(ms / 1000)}s. Verificá tu conexión e intentá de nuevo.`,
        ),
      );
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export function usePublicationWizard({
  publicacion,
  productos,
}: UsePublicationWizardParams): UsePublicationWizardResult {
  const [stepIndex, setStepIndex] = useState(0);
  const publicationRef = useRef(publicacion);
  publicationRef.current = publicacion;
  const publishingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  useEffect(() => {
    if (publicacion && !localItemsInitialized && items.length > 0) {
      setLocalItems(items);
      setLocalItemsInitialized(true);
    }
  }, [publicacion, localItemsInitialized, items]);

  const currentStep = WIZARD_STEPS[stepIndex] ?? 'fecha';

  const goToStep = useCallback((step: WizardStep) => {
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx >= 0) setStepIndex(idx);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }, []);

  const prevStep = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const addItem = useCallback(
    (producto: Producto) => {
      const alreadyAdded = localItems.some(
        (i) => i.fk_producto === producto.id_producto,
      );
      if (alreadyAdded) return;

      const newItem: WizardItemDraft = {
        tempId: generateLocalTempId(),
        fk_producto: producto.id_producto,
        fk_unidad: 0,
        stock: '',
        precio: '',
        foto: null,
      };
      setLocalItems((prev) => [...prev, newItem]);
    },
    [localItems],
  );

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

    for (const item of localItems) {
      const errors = validateItem(item);
      if (Object.keys(errors).length > 0) {
        validations.set(item.tempId, errors);
        hasError = true;
      }
    }

    setItemValidations(validations);
    return !hasError;
  }, [localItems]);

  const compensateCreatedItems = useCallback(
    async (pubId: number, createdIds: number[]) => {
      for (const id of createdIds) {
        if (!isValidItemId(id)) continue;
        try {
          await removeItemMutation.mutateAsync({ pubId, itemId: id });
        } catch (err) {
          if (__DEV__) {
            console.error(
              '[usePublicationWizard] compensateCreatedItems failed for id',
              id,
              err,
            );
          }
        }
      }
    },
    [removeItemMutation],
  );

  const compensateAutoCreatedPub = useCallback(
    async (pub: Publicacion) => {
      try {
        await deletePublicationMutation.mutateAsync(pub.id_publicacion);
        publicationRef.current = undefined;
      } catch (err) {
        if (__DEV__) {
          console.error(
            '[usePublicationWizard] compensateAutoCreatedPub failed:',
            err,
          );
        }
      }
    },
    [deletePublicationMutation],
  );

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

    const currentItems = localItems;
    const currentProductos = productos;
    const createdIds: number[] = [];
    const tempIdRemap: Array<{ oldTempId: string; newTempId: string }> = [];

    try {
      for (const item of currentItems) {
        const result = await persistItem(
          pub.id_publicacion,
          item,
          currentProductos,
          addItemMutation.mutateAsync,
          updateItemMutation.mutateAsync,
        );
        if (result.isNew) {
          createdIds.push(result.itemId);
          tempIdRemap.push({
            oldTempId: item.tempId,
            newTempId: String(result.itemId),
          });
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[usePublicationWizard] persistItem failed:', error);
      }
      await compensateCreatedItems(pub.id_publicacion, createdIds);
      if (autoCreatedPub) {
        await compensateAutoCreatedPub(pub);
      }
      throw error;
    }

    if (tempIdRemap.length > 0 && mountedRef.current) {
      setLocalItems((prev) =>
        prev.map((item) => {
          const remap = tempIdRemap.find((r) => r.oldTempId === item.tempId);
          return remap ? { ...item, tempId: remap.newTempId } : item;
        }),
      );
    }

    return pub;
  }, [
    localItems,
    productos,
    createMutation,
    compensateCreatedItems,
    compensateAutoCreatedPub,
    addItemMutation,
    updateItemMutation,
  ]);

  const deleteStaleItems = useCallback(
    async (
      pubId: number,
      existingIds: Set<string>,
      currentIds: Set<string>,
    ): Promise<void> => {
      for (const id of existingIds) {
        if (currentIds.has(id)) continue;

        const itemId = Number(id);
        if (!isValidItemId(itemId)) {
          logDev('[usePublicationWizard] invalid item id for removal:', id);
          continue;
        }
        try {
          await removeItemMutation.mutateAsync({ pubId, itemId });
        } catch (err) {
          logDev('[usePublicationWizard] failed to delete stale item', id, err);
        }
      }
    },
    [removeItemMutation],
  );

  const publish = useCallback(async () => {
    if (publishingRef.current) return;
    publishingRef.current = true;

    try {
      const pub = await withTimeout(
        ensurePublicationAndPersist(),
        PUBLISH_TIMEOUT_MS,
      );
      if (!pub) return;

      const existingIds = new Set(
        productos.map((p) => String(p.id_producto_semanal)),
      );
      const currentIds = new Set(localItems.map((i) => i.tempId));

      await deleteStaleItems(
        pub.id_publicacion,
        existingIds,
        currentIds,
      );

      await publishMutation.mutateAsync(pub.id_publicacion);
    } finally {
      publishingRef.current = false;
    }
  }, [
    localItems,
    productos,
    ensurePublicationAndPersist,
    deleteStaleItems,
    publishMutation,
  ]);

  const saveDraft = useCallback(async () => {
    if (publishingRef.current) return;
    publishingRef.current = true;

    try {
      await withTimeout(ensurePublicationAndPersist(), PUBLISH_TIMEOUT_MS);
    } finally {
      publishingRef.current = false;
    }
  }, [ensurePublicationAndPersist]);

  return {
    currentStep,
    stepIndex,
    items: localItems,
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
