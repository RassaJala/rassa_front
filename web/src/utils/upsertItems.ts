// ── Extracted upsert logic — testable via DI ────────────────

import { logError } from './logger';
import { withTimeout } from './withTimeout';

const IMAGE_UPLOAD_TIMEOUT_MS = 30_000;

export interface WizardItemInput {
  tempId: string;
  isNew: boolean;
  fk_producto: number;
  fk_unidad: number;
  stock: string;
  precio: string;
  imageFile: File | null;
}

export interface UpsertItemsDeps {
  add: (vars: {
    pubId: number;
    payload: {
      fk_producto: number;
      fk_unidad: number;
      stock: number;
      precio: number;
    };
  }) => Promise<{ data: { id_producto_semanal: number } }>;
  update: (vars: {
    pubId: number;
    itemId: number;
    payload: {
      fk_producto: number;
      fk_unidad: number;
      stock: number;
      precio: number;
    };
  }) => Promise<{ data: { id_producto_semanal: number } }>;
  uploadImage: (vars: {
    pubId: number;
    itemId: number;
    formData: FormData;
    signal?: AbortSignal;
  }) => Promise<unknown>;
  hasServerPub: boolean;
}

export interface UpsertItemsResult {
  tempIdToServerId: Map<string, number>;
  newServerIds: number[];
  updatedServerIds: number[];
  failedUploads: number;
}

export const MAX_PRODUCTS = 50;

export async function upsertItems(
  pubId: number,
  items: WizardItemInput[],
  deps: UpsertItemsDeps,
  signal?: AbortSignal,
): Promise<UpsertItemsResult> {
  if (items.length > MAX_PRODUCTS) {
    throw new Error(`Máximo ${MAX_PRODUCTS} productos por publicación.`);
  }
  const newServerIds: number[] = [];
  const updatedServerIds: number[] = [];
  const tempIdToServerId = new Map<string, number>();
  let failedUploads = 0;

  for (const item of items) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const serverId = Number(item.tempId);
    const isExisting = !item.isNew && deps.hasServerPub;

    const payload = {
      fk_producto: item.fk_producto,
      fk_unidad: item.fk_unidad,
      stock: Number(item.stock),
      precio: Number(item.precio),
    };

    let itemId: number;

    if (isExisting) {
      const result = await deps.update({
        pubId,
        itemId: serverId,
        payload,
      });
      itemId = result.data.id_producto_semanal;
      updatedServerIds.push(itemId);
    } else {
      const result = await deps.add({ pubId, payload });
      itemId = result.data.id_producto_semanal;
      newServerIds.push(itemId);
    }

    tempIdToServerId.set(item.tempId, itemId);

    if (item.imageFile) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      const formData = new FormData();
      formData.append('imagen', item.imageFile);
      const uploadController = new AbortController();
      const onAbort = () => uploadController.abort();
      signal?.addEventListener('abort', onAbort, { once: true });
      try {
        await withTimeout(
          deps.uploadImage({
            pubId,
            itemId,
            formData,
            signal: uploadController.signal,
          }),
          IMAGE_UPLOAD_TIMEOUT_MS,
          uploadController,
        );
      } catch (uploadErr) {
        failedUploads++;
        logError('upsertItems:imageUpload', uploadErr, { pubId, itemId });
      } finally {
        signal?.removeEventListener('abort', onAbort);
      }
    }
  }

  return { tempIdToServerId, newServerIds, updatedServerIds, failedUploads };
}
