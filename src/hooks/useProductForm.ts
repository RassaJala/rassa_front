import { useEffect, useState } from 'react';

import {
  useCategorias,
  useCreateProducto,
  useProducto,
  useUnidades,
  useUpdateProducto,
} from '@/hooks/useProductos';
import type { Categoria, Unidad } from '@/services/productos';

interface FormErrors {
  nombre_producto?: string;
  precio?: string;
  stock?: string;
  fk_categoria?: string;
  fk_unidad?: string;
}

interface FormState {
  nombre: string;
  precio: string;
  stock: string;
  fkCategoria: number | null;
  fkUnidad: number | null;
  esPerecedero: boolean;
  imagenUri: string | null;
  descripcion: string;
}

function validateForm(data: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!data.nombre.trim()) {
    errors.nombre_producto = 'El nombre es obligatorio.';
  } else if (data.nombre.trim().length < 3) {
    errors.nombre_producto = 'El nombre debe tener al menos 3 caracteres.';
  }

  if (!data.precio.trim()) {
    errors.precio = 'El precio es obligatorio.';
  } else if (Number.parseFloat(data.precio) < 0) {
    errors.precio = 'El precio no puede ser negativo.';
  }

  if (!data.stock.trim()) {
    errors.stock = 'El stock es obligatorio.';
  } else if (Number.parseInt(data.stock, 10) < 0) {
    errors.stock = 'El stock no puede ser negativo.';
  }

  if (data.fkCategoria === null) {
    errors.fk_categoria = 'Selecciona una categoría.';
  }

  if (data.fkUnidad === null) {
    errors.fk_unidad = 'Selecciona una unidad.';
  }

  return errors;
}

interface UseProductFormResult {
  form: FormState;
  errors: FormErrors;
  categorias: Categoria[];
  unidades: Unidad[];
  isEditing: boolean;
  isLoadingProducto: boolean;
  isSaving: boolean;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  handleSubmit: (onSuccess: () => void, onError: () => void) => void;
}

export function useProductForm(productoId?: number): UseProductFormResult {
  const isEditing = productoId !== undefined && productoId > 0;

  const { data: productoResponse, isLoading: isLoadingProducto } = useProducto(
    productoId ?? 0,
  );
  const { data: categoriasResponse } = useCategorias();
  const { data: unidadesResponse } = useUnidades();
  const createMutation = useCreateProducto();
  const updateMutation = useUpdateProducto();

  const [form, setForm] = useState<FormState>({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    fkCategoria: null,
    fkUnidad: null,
    esPerecedero: false,
    imagenUri: null,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const categorias: Categoria[] = categoriasResponse?.data ?? [];
  const unidades: Unidad[] = unidadesResponse?.data ?? [];

  useEffect(() => {
    if (isEditing && productoResponse?.data) {
      const p = productoResponse.data;
      setForm({
        nombre: p.nombre_producto,
        descripcion: p.descripcion,
        precio: String(p.precio),
        stock: String(p.stock),
        fkCategoria: p.fk_categoria,
        fkUnidad: p.fk_unidad,
        esPerecedero: p.es_perecedero,
        imagenUri: p.imagen_principal,
      });
    }
  }, [isEditing, productoResponse]);

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (
    onSuccess: () => void,
    onError: () => void,
  ) => {
    const validationErrors = validateForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload: Record<string, unknown> = {
      nombre_producto: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      precio: Number.parseFloat(form.precio),
      stock: Number.parseInt(form.stock, 10),
      fk_categoria: form.fkCategoria,
      fk_unidad: form.fkUnidad,
      es_perecedero: form.esPerecedero,
    };

    if (isEditing && productoId) {
      updateMutation.mutate(
        { id: productoId, payload },
        { onSuccess, onError },
      );
    } else {
      createMutation.mutate(payload, { onSuccess, onError });
    }
  };

  return {
    form,
    errors,
    categorias,
    unidades,
    isEditing,
    isLoadingProducto,
    isSaving: createMutation.isPending || updateMutation.isPending,
    updateField,
    handleSubmit,
  };
}
