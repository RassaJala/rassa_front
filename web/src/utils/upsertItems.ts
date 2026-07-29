// ── Extracted upsert logic — testable via DI ────────────────

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
  }) => Promise<unknown>;
  hasServerPub: boolean;
}

export interface UpsertItemsResult {
  tempIdToServerId: Map<string, number>;
  newServerIds: number[];
  updatedServerIds: number[];
}

export async function upsertItems(
  pubId: number,
  items: WizardItemInput[],
  deps: UpsertItemsDeps,
  signal?: AbortSignal,
): Promise<UpsertItemsResult> {
  const newServerIds: number[] = [];
  const updatedServerIds: number[] = [];
  const tempIdToServerId = new Map<string, number>();

  for (const item of items) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
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
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      const formData = new FormData();
      formData.append("imagen", item.imageFile);
      await deps.uploadImage({ pubId, itemId, formData });
    }
  }

  return { tempIdToServerId, newServerIds, updatedServerIds };
}
