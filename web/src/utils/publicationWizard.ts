// ── Pure helpers — extracted for testability ────────────────

// Date helpers are shared with mobile through packages/common (W1):
// parseLocalDate / isMondayToday / getWeekNumber live in @/common/waste.
export { getWeekNumber, isMondayToday, parseLocalDate } from '@/common/waste';

import { DELETED_PRODUCT_VALIDATION } from '@/common/publicationLabels';

export function generateTempId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Returns the next Monday from today (or today if it's already Monday). */
export function getNextMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 1 : day <= 1 ? 0 : 8 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function formatDate(iso: Date, opts?: { short?: boolean }): string {
  if (opts?.short) {
    return iso.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return iso.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export interface WizardItemDraft {
  tempId: string;
  isNew: boolean;
  fk_producto: number;
  nombre_producto: string;
  fk_unidad: number;
  stock: string;
  precio: string;
  foto: string | null;
  imageFile: File | null;
  imagePreview: string | null;
}

export interface ItemValidation {
  stock?: string;
  precio?: string;
  fk_unidad?: string;
  producto?: string;
}

export function validateItem(item: WizardItemDraft): ItemValidation {
  const errors: ItemValidation = {};
  if (!item.nombre_producto) {
    errors.producto = DELETED_PRODUCT_VALIDATION;
  }
  const stockNum = Number(item.stock);
  if (!item.stock || Number.isNaN(stockNum) || stockNum <= 0) {
    errors.stock = 'Stock debe ser mayor a 0.';
  } else if (!Number.isInteger(stockNum)) {
    errors.stock = 'Stock debe ser un número entero.';
  }
  const precioNum = Number(item.precio);
  if (!item.precio || Number.isNaN(precioNum) || precioNum <= 0) {
    errors.precio = 'Precio debe ser mayor a 0.';
  }
  if (!item.fk_unidad) {
    errors.fk_unidad = 'Seleccioná una unidad.';
  }
  return errors;
}

export function validateAllItems(items: WizardItemDraft[]): boolean {
  return items.every((item) => Object.keys(validateItem(item)).length === 0);
}

export function canJumpToStep(
  targetIdx: number,
  currentIdx: number,
  steps: string[],
  items: WizardItemDraft[],
): boolean {
  if (targetIdx <= currentIdx) return true;
  for (let i = currentIdx; i < targetIdx; i++) {
    if (steps[i] === 'productos' && !validateAllItems(items)) return false;
  }
  return true;
}
