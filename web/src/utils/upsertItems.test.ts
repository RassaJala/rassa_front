import { describe, expect, it, vi } from 'vitest';

import {
  MAX_PRODUCTS,
  upsertItems,
  type UpsertItemsDeps,
  type WizardItemInput,
} from './upsertItems';
import { deleteOrphans, type DeleteOrphansDeps } from './deleteOrphans';

// ── Helpers ──────────────────────────────────────────────────

function makeItem(overrides: Partial<WizardItemInput> = {}): WizardItemInput {
  return {
    tempId: 'local_1',
    isNew: true,
    fk_producto: 10,
    fk_unidad: 1,
    stock: '5',
    precio: '250',
    imageFile: null,
    ...overrides,
  };
}

function makeUpsertDeps(
  overrides: Partial<UpsertItemsDeps> = {},
): UpsertItemsDeps {
  return {
    add: vi.fn().mockResolvedValue({
      data: { id_producto_semanal: 100 },
    }),
    update: vi.fn().mockResolvedValue({
      data: { id_producto_semanal: 200 },
    }),
    uploadImage: vi.fn().mockResolvedValue(undefined),
    hasServerPub: false,
    ...overrides,
  };
}

function makeOrphanDeps(
  overrides: Partial<DeleteOrphansDeps> = {},
): DeleteOrphansDeps {
  return {
    removeItem: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── upsertItems ─────────────────────────────────────────────

describe('upsertItems', () => {
  it('creates new item when isNew=true', async () => {
    const deps = makeUpsertDeps();
    const items = [makeItem({ isNew: true })];

    const result = await upsertItems(1, items, deps);

    expect(deps.add).toHaveBeenCalledWith({
      pubId: 1,
      payload: {
        fk_producto: 10,
        fk_unidad: 1,
        stock: 5,
        precio: 250,
      },
    });
    expect(deps.update).not.toHaveBeenCalled();
    expect(result.newServerIds).toEqual([100]);
    expect(result.tempIdToServerId.get('local_1')).toBe(100);
  });

  it('updates existing item when isNew=false and server pub exists', async () => {
    const deps = makeUpsertDeps({ hasServerPub: true });
    const items = [makeItem({ isNew: false, tempId: '42' })];

    const result = await upsertItems(1, items, deps);

    expect(deps.update).toHaveBeenCalledWith({
      pubId: 1,
      itemId: 42,
      payload: {
        fk_producto: 10,
        fk_unidad: 1,
        stock: 5,
        precio: 250,
      },
    });
    expect(deps.add).not.toHaveBeenCalled();
    expect(result.newServerIds).toEqual([]);
    expect(result.tempIdToServerId.get('42')).toBe(200);
  });

  it('treats isNew=false as new when hasServerPub=false', async () => {
    const deps = makeUpsertDeps({ hasServerPub: false });
    const items = [makeItem({ isNew: false, tempId: '42' })];

    await upsertItems(1, items, deps);

    expect(deps.add).toHaveBeenCalled();
    expect(deps.update).not.toHaveBeenCalled();
  });

  it('uploads image when imageFile is present', async () => {
    const file = new File(['blob'], 'test.jpg', { type: 'image/jpeg' });
    const deps = makeUpsertDeps();
    const items = [makeItem({ imageFile: file })];

    await upsertItems(1, items, deps);

    expect(deps.uploadImage).toHaveBeenCalledTimes(1);
    const call = (deps.uploadImage as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(call.pubId).toBe(1);
    expect(call.itemId).toBe(100);
    expect(call.formData).toBeInstanceOf(FormData);
  });

  it('skips image upload when imageFile is null', async () => {
    const deps = makeUpsertDeps();
    const items = [makeItem({ imageFile: null })];

    await upsertItems(1, items, deps);

    expect(deps.uploadImage).not.toHaveBeenCalled();
  });

  it('processes items sequentially in order', async () => {
    const callOrder: number[] = [];
    const deps = makeUpsertDeps({
      add: vi.fn().mockImplementation(async (vars: { pubId: number }) => {
        callOrder.push(vars.pubId);
        return { data: { id_producto_semanal: callOrder.length + 100 } };
      }),
    });
    const items = [
      makeItem({ tempId: 'local_1', fk_producto: 1 }),
      makeItem({ tempId: 'local_2', fk_producto: 2 }),
      makeItem({ tempId: 'local_3', fk_producto: 3 }),
    ];

    await upsertItems(1, items, deps);

    expect(callOrder).toEqual([1, 1, 1]);
  });

  it('throws AbortError when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const deps = makeUpsertDeps();
    const items = [makeItem()];

    await expect(
      upsertItems(1, items, deps, controller.signal),
    ).rejects.toThrow('Cancelled');
  });

  it('throws when aborted mid-iteration', async () => {
    const controller = new AbortController();
    let callCount = 0;
    const deps = makeUpsertDeps({
      add: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 2) controller.abort();
        return { data: { id_producto_semanal: 100 + callCount } };
      }),
    });
    const items = [
      makeItem({ tempId: 'local_1' }),
      makeItem({ tempId: 'local_2' }),
      makeItem({ tempId: 'local_3' }),
    ];

    await expect(
      upsertItems(1, items, deps, controller.signal),
    ).rejects.toThrow('Cancelled');
  });

  it('throws when aborted before image upload', async () => {
    const controller = new AbortController();
    const file = new File(['blob'], 'test.jpg', { type: 'image/jpeg' });
    const deps = makeUpsertDeps();
    const items = [makeItem({ imageFile: file })];

    controller.abort();
    await expect(
      upsertItems(1, items, deps, controller.signal),
    ).rejects.toThrow('Cancelled');
  });

  it('returns empty result for empty items list', async () => {
    const deps = makeUpsertDeps();
    const result = await upsertItems(1, [], deps);

    expect(result.tempIdToServerId.size).toBe(0);
    expect(result.newServerIds).toEqual([]);
    expect(deps.add).not.toHaveBeenCalled();
  });

  it('propagates add error', async () => {
    const deps = makeUpsertDeps({
      add: vi.fn().mockRejectedValue(new Error('server error')),
    });
    const items = [makeItem()];

    await expect(upsertItems(1, items, deps)).rejects.toThrow('server error');
  });

  it('propagates update error', async () => {
    const deps = makeUpsertDeps({
      hasServerPub: true,
      update: vi.fn().mockRejectedValue(new Error('update failed')),
    });
    const items = [makeItem({ isNew: false, tempId: '42' })];

    await expect(upsertItems(1, items, deps)).rejects.toThrow('update failed');
  });

  it('propagates image upload error', async () => {
    const file = new File(['blob'], 'test.jpg', { type: 'image/jpeg' });
    const deps = makeUpsertDeps({
      uploadImage: vi.fn().mockRejectedValue(new Error('upload failed')),
    });
    const items = [
      makeItem({ tempId: 'local_1', imageFile: file }),
      makeItem({ tempId: 'local_2' }),
    ];

    await expect(upsertItems(1, items, deps)).rejects.toThrow('upload failed');
  });

  it('continues to next item after image upload', async () => {
    const file = new File(['blob'], 'test.jpg', { type: 'image/jpeg' });
    const deps = makeUpsertDeps();
    const items = [
      makeItem({ tempId: 'local_1', imageFile: file }),
      makeItem({ tempId: 'local_2' }),
    ];

    const result = await upsertItems(1, items, deps);

    expect(deps.add).toHaveBeenCalledTimes(2);
    expect(deps.uploadImage).toHaveBeenCalledTimes(1);
    expect(result.tempIdToServerId.size).toBe(2);
  });

  it('maps multiple items to correct server IDs', async () => {
    let nextId = 200;
    const deps = makeUpsertDeps({
      add: vi.fn().mockImplementation(async () => {
        nextId++;
        return { data: { id_producto_semanal: nextId } };
      }),
    });
    const items = [
      makeItem({ tempId: 'local_1', fk_producto: 1 }),
      makeItem({ tempId: 'local_2', fk_producto: 2 }),
    ];

    const result = await upsertItems(1, items, deps);

    expect(result.tempIdToServerId.get('local_1')).toBe(201);
    expect(result.tempIdToServerId.get('local_2')).toBe(202);
    expect(result.newServerIds).toEqual([201, 202]);
  });

  it('rejects with network timeout error', async () => {
    const deps = makeUpsertDeps({
      add: vi.fn().mockRejectedValue(new Error('timeout of 5000ms exceeded')),
    });
    const items = [makeItem()];

    await expect(upsertItems(1, items, deps)).rejects.toThrow(
      'timeout of 5000ms exceeded',
    );
  });

  it('handles malformed server response with missing id (create)', async () => {
    const deps = makeUpsertDeps({
      add: vi.fn().mockResolvedValue({ data: {} }),
    });
    const items = [makeItem()];

    const result = await upsertItems(1, items, deps);
    expect(result.tempIdToServerId.get('local_1')).toBeUndefined();
  });

  it('handles malformed server response with missing id (update)', async () => {
    const deps = makeUpsertDeps({
      hasServerPub: true,
      update: vi.fn().mockResolvedValue({ data: {} }),
    });
    const items = [makeItem({ isNew: false, tempId: '42' })];

    const result = await upsertItems(1, items, deps);
    expect(result.tempIdToServerId.get('42')).toBeUndefined();
  });

  it('throws when aborted mid-sequence between items', async () => {
    const controller = new AbortController();
    let callCount = 0;
    const deps = makeUpsertDeps({
      add: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) controller.abort();
        return { data: { id_producto_semanal: 100 + callCount } };
      }),
    });
    const items = [
      makeItem({ tempId: 'local_1' }),
      makeItem({ tempId: 'local_2' }),
    ];

    await expect(
      upsertItems(1, items, deps, controller.signal),
    ).rejects.toThrow('Cancelled');
  });

  it('processes mixed create and update items', async () => {
    const deps = makeUpsertDeps({ hasServerPub: true });
    const items = [
      makeItem({ tempId: 'local_1', isNew: true }),
      makeItem({ tempId: '42', isNew: false }),
    ];

    const result = await upsertItems(1, items, deps);

    expect(deps.add).toHaveBeenCalledTimes(1);
    expect(deps.update).toHaveBeenCalledTimes(1);
    expect(result.newServerIds).toEqual([100]);
    expect(result.updatedServerIds).toEqual([200]);
  });

  it('processes mixed items with and without images', async () => {
    const file = new File(['blob'], 'test.jpg', { type: 'image/jpeg' });
    const deps = makeUpsertDeps();
    const items = [
      makeItem({ tempId: 'local_1', imageFile: file }),
      makeItem({ tempId: 'local_2', imageFile: null }),
    ];

    const result = await upsertItems(1, items, deps);

    expect(deps.uploadImage).toHaveBeenCalledTimes(1);
    expect(result.tempIdToServerId.size).toBe(2);
  });

  it('stops on image upload failure', async () => {
    const file = new File(['blob'], 'test.jpg', { type: 'image/jpeg' });
    const deps = makeUpsertDeps({
      uploadImage: vi.fn().mockRejectedValue(new Error('upload failed')),
    });
    const items = [
      makeItem({ tempId: 'local_1', imageFile: file }),
      makeItem({ tempId: 'local_2' }),
    ];

    await expect(upsertItems(1, items, deps)).rejects.toThrow('upload failed');
  });

  it('rejects when items exceed MAX_PRODUCTS', async () => {
    const deps = makeUpsertDeps();
    const items = Array.from({ length: MAX_PRODUCTS + 1 }, (_, i) =>
      makeItem({ tempId: `local_${i}`, fk_producto: i + 1 }),
    );

    await expect(upsertItems(1, items, deps)).rejects.toThrow(
      `Máximo ${String(MAX_PRODUCTS)} productos por publicación.`,
    );
    expect(deps.add).not.toHaveBeenCalled();
  });

  it('accepts exactly MAX_PRODUCTS items', async () => {
    const deps = makeUpsertDeps();
    const items = Array.from({ length: MAX_PRODUCTS }, (_, i) =>
      makeItem({ tempId: `local_${i}`, fk_producto: i + 1 }),
    );

    const result = await upsertItems(1, items, deps);
    expect(deps.add).toHaveBeenCalledTimes(MAX_PRODUCTS);
    expect(result.tempIdToServerId.size).toBe(MAX_PRODUCTS);
  });

  it('throws when server returns null data for create', async () => {
    const deps = makeUpsertDeps({
      add: vi.fn().mockResolvedValue(null),
    });
    const items = [makeItem()];

    await expect(upsertItems(1, items, deps)).rejects.toThrow();
  });
});

// ── deleteOrphans ───────────────────────────────────────────

describe('deleteOrphans', () => {
  interface ServerItem {
    id_producto_semanal: number;
    fk_producto: number;
  }

  it('deletes items not in current wizard list', async () => {
    const removeItem = vi.fn().mockResolvedValue(undefined);
    const deps = makeOrphanDeps({ removeItem });

    const serverItems: ServerItem[] = [
      { id_producto_semanal: 10, fk_producto: 1 },
      { id_producto_semanal: 20, fk_producto: 2 },
      { id_producto_semanal: 30, fk_producto: 3 },
    ];
    const currentIds = new Set(['10', '30']); // 20 is orphan

    const failures = await deleteOrphans(1, serverItems, currentIds, deps);

    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(removeItem).toHaveBeenCalledWith({ pubId: 1, itemId: 20 });
    expect(failures).toBe(0);
  });

  it('does not delete items that are in the current list', async () => {
    const removeItem = vi.fn().mockResolvedValue(undefined);
    const deps = makeOrphanDeps({ removeItem });

    const serverItems: ServerItem[] = [
      { id_producto_semanal: 10, fk_producto: 1 },
      { id_producto_semanal: 20, fk_producto: 2 },
    ];
    const currentIds = new Set(['10', '20']);

    const failures = await deleteOrphans(1, serverItems, currentIds, deps);

    expect(removeItem).not.toHaveBeenCalled();
    expect(failures).toBe(0);
  });

  it('counts failures when delete fails', async () => {
    const removeItem = vi.fn().mockRejectedValue(new Error('delete failed'));
    const deps = makeOrphanDeps({ removeItem });

    const serverItems: ServerItem[] = [
      { id_producto_semanal: 10, fk_producto: 1 },
      { id_producto_semanal: 20, fk_producto: 2 },
    ];
    const currentIds = new Set<string>(); // both are orphans

    const failures = await deleteOrphans(1, serverItems, currentIds, deps);

    expect(failures).toBe(2);
  });

  it('returns 0 failures when no orphans exist', async () => {
    const removeItem = vi.fn();
    const deps = makeOrphanDeps({ removeItem });

    const serverItems: ServerItem[] = [
      { id_producto_semanal: 10, fk_producto: 1 },
    ];
    const currentIds = new Set(['10']);

    const failures = await deleteOrphans(1, serverItems, currentIds, deps);

    expect(removeItem).not.toHaveBeenCalled();
    expect(failures).toBe(0);
  });

  it('returns 0 for empty server items', async () => {
    const removeItem = vi.fn();
    const deps = makeOrphanDeps({ removeItem });

    const failures = await deleteOrphans(1, [], new Set(), deps);

    expect(removeItem).not.toHaveBeenCalled();
    expect(failures).toBe(0);
  });

  it('continues deleting other orphans after one fails', async () => {
    let callCount = 0;
    const removeItem = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('first delete failed');
    });
    const deps = makeOrphanDeps({ removeItem });

    const serverItems: ServerItem[] = [
      { id_producto_semanal: 10, fk_producto: 1 },
      { id_producto_semanal: 20, fk_producto: 2 },
    ];
    const currentIds = new Set<string>();

    const failures = await deleteOrphans(1, serverItems, currentIds, deps);

    expect(removeItem).toHaveBeenCalledTimes(2);
    expect(failures).toBe(1);
  });

  it('throws AbortError when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const deps = makeOrphanDeps();
    const serverItems: ServerItem[] = [
      { id_producto_semanal: 10, fk_producto: 1 },
    ];

    await expect(
      deleteOrphans(1, serverItems, new Set(), deps, controller.signal),
    ).rejects.toThrow('Cancelled');
  });

  it('throws when aborted mid-deletion', async () => {
    const controller = new AbortController();
    let callCount = 0;
    const removeItem = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) controller.abort();
    });
    const deps = makeOrphanDeps({ removeItem });

    const serverItems: ServerItem[] = [
      { id_producto_semanal: 10, fk_producto: 1 },
      { id_producto_semanal: 20, fk_producto: 2 },
    ];
    const currentIds = new Set<string>();

    await expect(
      deleteOrphans(1, serverItems, currentIds, deps, controller.signal),
    ).rejects.toThrow('Cancelled');
  });
});
