import { useCallback, useState } from 'react';

import type { Producto } from '@/services/productos';
import type { ProductoSemanal, Publicacion } from '@/services/publications';

import {
  useAddProductoSemanal,
  useCreatePublicacion,
  useDeleteProductoSemanal,
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
  allProductos: Producto[];
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
    field: string,
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

  if (!item.stock || Number(item.stock) <= 0) {
    errors.stock = 'El stock debe ser mayor a 0.';
  }
  if (!item.precio || Number(item.precio) <= 0) {
    errors.precio = 'El precio debe ser mayor a 0.';
  }
  if (!item.fk_unidad) {
    errors.fk_unidad = 'Selecciona una unidad.';
  }
  if (!item.foto || item.foto.trim() === '') {
    errors.foto = 'La foto es requerida.';
  }

  return errors;
}

export function usePublicationWizard({
  publicacion,
  productos,
  allProductos: _allProductos,
}: UsePublicationWizardParams): UsePublicationWizardResult {
  const [stepIndex, setStepIndex] = useState(0);

  const createMutation = useCreatePublicacion();
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
  const [itemValidations, setItemValidations] = useState<
    Map<string, WizardItemValidation>
  >(new Map());

  const activeItems = publicacion ? items : localItems;

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
    (tempId: string, field: string, value: string | number | null) => {
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

  const publish = useCallback(async () => {
    if (!publicacion) return;

    for (const item of activeItems) {
      const isExisting = productos.some(
        (p) => String(p.id_producto_semanal) === item.tempId,
      );

      const payload = {
        fk_producto: item.fk_producto,
        fk_unidad: item.fk_unidad,
        stock: Number(item.stock),
        precio: Number(item.precio),
        foto: item.foto,
      };

      if (isExisting) {
        await updateItemMutation.mutateAsync({
          pubId: publicacion.id_publicacion,
          itemId: Number(item.tempId),
          payload,
        });
      } else {
        await addItemMutation.mutateAsync({
          pubId: publicacion.id_publicacion,
          payload,
        });
      }
    }

    const existingIds = new Set(
      productos.map((p) => String(p.id_producto_semanal)),
    );
    const currentIds = new Set(activeItems.map((i) => i.tempId));

    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        await removeItemMutation.mutateAsync({
          pubId: publicacion.id_publicacion,
          itemId: Number(id),
        });
      }
    }

    await publishMutation.mutateAsync(publicacion.id_publicacion);
  }, [
    publicacion,
    activeItems,
    productos,
    addItemMutation,
    updateItemMutation,
    removeItemMutation,
    publishMutation,
  ]);

  const saveDraft = useCallback(async () => {
    let pub = publicacion;

    if (!pub) {
      const result = await createMutation.mutateAsync();
      pub = result.data;
    }

    if (pub) {
      for (const item of activeItems) {
        const payload = {
          fk_producto: item.fk_producto,
          fk_unidad: item.fk_unidad,
          stock: Number(item.stock),
          precio: Number(item.precio),
          foto: item.foto,
        };

        const isExisting = productos.some(
          (p) => String(p.id_producto_semanal) === item.tempId,
        );

        if (isExisting) {
          await updateItemMutation.mutateAsync({
            pubId: pub.id_publicacion,
            itemId: Number(item.tempId),
            payload,
          });
        } else {
          await addItemMutation.mutateAsync({
            pubId: pub.id_publicacion,
            payload,
          });
        }
      }
    }
  }, [
    publicacion,
    activeItems,
    productos,
    createMutation,
    addItemMutation,
    updateItemMutation,
  ]);

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
