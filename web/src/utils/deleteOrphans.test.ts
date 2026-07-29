import { describe, expect, it, vi } from 'vitest';

import {
  deleteOrphans,
  type DeleteOrphansDeps,
  type ServerProducto,
} from './deleteOrphans';

// ── Helpers ──────────────────────────────────────────────────

function makeDeps(
  overrides: Partial<DeleteOrphansDeps> = {},
): DeleteOrphansDeps {
  return {
    removeItem: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeServerItem(id: number): ServerProducto {
  return { id_producto_semanal: id };
}

// ── Tests ──────────────────────────────────────────────────

describe('deleteOrphans', () => {
  it('returns 0 when no server items exist', async () => {
    const deps = makeDeps();
    const result = await deleteOrphans(1, [], new Set(), deps);
    expect(result).toBe(0);
    expect(deps.removeItem).not.toHaveBeenCalled();
  });

  it('returns 0 when all server items are in currentIds', async () => {
    const deps = makeDeps();
    const serverItems = [
      makeServerItem(1),
      makeServerItem(2),
      makeServerItem(3),
    ];
    const currentIds = new Set(['1', '2', '3']);

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(0);
    expect(deps.removeItem).not.toHaveBeenCalled();
  });

  it('deletes items not in currentIds', async () => {
    const deps = makeDeps();
    const serverItems = [
      makeServerItem(1),
      makeServerItem(2),
      makeServerItem(3),
    ];
    const currentIds = new Set(['1', '3']);

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(0);
    expect(deps.removeItem).toHaveBeenCalledTimes(1);
    expect(deps.removeItem).toHaveBeenCalledWith({ pubId: 1, itemId: 2 });
  });

  it('deletes multiple orphan items', async () => {
    const deps = makeDeps();
    const serverItems = [
      makeServerItem(1),
      makeServerItem(2),
      makeServerItem(3),
    ];
    const currentIds = new Set(['2']);

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(0);
    expect(deps.removeItem).toHaveBeenCalledTimes(2);
    expect(deps.removeItem).toHaveBeenCalledWith({ pubId: 1, itemId: 1 });
    expect(deps.removeItem).toHaveBeenCalledWith({ pubId: 1, itemId: 3 });
  });

  it('counts failures when removeItem rejects', async () => {
    const removeItem = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);
    const deps = makeDeps({ removeItem });
    const serverItems = [makeServerItem(1), makeServerItem(2)];
    const currentIds = new Set();

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(1);
    expect(removeItem).toHaveBeenCalledTimes(2);
  });

  it('counts all failures when all removeItem calls reject', async () => {
    const deps = makeDeps({
      removeItem: vi.fn().mockRejectedValue(new Error('fail')),
    });
    const serverItems = [
      makeServerItem(1),
      makeServerItem(2),
      makeServerItem(3),
    ];
    const currentIds = new Set();

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(3);
  });

  it('passes correct pubId to removeItem', async () => {
    const deps = makeDeps();
    const serverItems = [makeServerItem(42)];
    const currentIds = new Set();

    await deleteOrphans(99, serverItems, currentIds, deps);
    expect(deps.removeItem).toHaveBeenCalledWith({ pubId: 99, itemId: 42 });
  });

  it('throws AbortError when signal is already aborted', async () => {
    const deps = makeDeps();
    const controller = new AbortController();
    controller.abort();

    await expect(
      deleteOrphans(1, [makeServerItem(1)], new Set(), deps, controller.signal),
    ).rejects.toThrow('Cancelled');
  });

  it('throws AbortError when signal aborts mid-deletion', async () => {
    const controller = new AbortController();
    let callCount = 0;
    const removeItem = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) controller.abort();
    });
    const deps = makeDeps({ removeItem });
    const serverItems = [
      makeServerItem(1),
      makeServerItem(2),
      makeServerItem(3),
    ];
    const currentIds = new Set();

    await expect(
      deleteOrphans(1, serverItems, currentIds, deps, controller.signal),
    ).rejects.toThrow('Cancelled');
  });

  it('works with empty serverItems and empty currentIds', async () => {
    const deps = makeDeps();
    const result = await deleteOrphans(1, [], new Set(), deps);
    expect(result).toBe(0);
  });

  it('counts failure on 404 delete (already deleted)', async () => {
    const deps = makeDeps({
      removeItem: vi.fn().mockRejectedValue(new Error('404 not found')),
    });
    const serverItems = [makeServerItem(42)];
    const currentIds = new Set<string>();

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(1);
  });

  it('counts failure on 500 server error', async () => {
    const deps = makeDeps({
      removeItem: vi.fn().mockRejectedValue(new Error('500 Internal Server Error')),
    });
    const serverItems = [makeServerItem(1)];
    const currentIds = new Set<string>();

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(1);
  });

  it('counts failure on network timeout', async () => {
    const deps = makeDeps({
      removeItem: vi.fn().mockRejectedValue(new Error('timeout of 5000ms exceeded')),
    });
    const serverItems = [makeServerItem(1)];
    const currentIds = new Set<string>();

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(1);
  });

  it('counts failure on 403 forbidden', async () => {
    const deps = makeDeps({
      removeItem: vi.fn().mockRejectedValue(new Error('403 Forbidden')),
    });
    const serverItems = [makeServerItem(1)];
    const currentIds = new Set<string>();

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(1);
  });

  it('handles empty serverIds array', async () => {
    const deps = makeDeps();
    const result = await deleteOrphans(1, [], new Set('1', '2'), deps);
    expect(result).toBe(0);
    expect(deps.removeItem).not.toHaveBeenCalled();
  });

  it('handles mixed valid and invalid serverIds', async () => {
    const deps = makeDeps();
    const serverItems = [
      makeServerItem(1),
      makeServerItem(2),
      makeServerItem(3),
    ];
    const currentIds = new Set(['1', '999']);

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(0);
    expect(deps.removeItem).toHaveBeenCalledTimes(2);
    expect(deps.removeItem).toHaveBeenCalledWith({ pubId: 1, itemId: 2 });
    expect(deps.removeItem).toHaveBeenCalledWith({ pubId: 1, itemId: 3 });
  });

  it('handles large serverIds array of 20+ items', async () => {
    const deps = makeDeps();
    const serverItems = Array.from({ length: 25 }, (_, i) => makeServerItem(i + 1));
    const currentIds = new Set<string>();

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(0);
    expect(deps.removeItem).toHaveBeenCalledTimes(25);
  });

  it('handles duplicate serverIds in array', async () => {
    const deps = makeDeps();
    const serverItems = [
      makeServerItem(1),
      makeServerItem(1),
      makeServerItem(2),
    ];
    const currentIds = new Set(['1']);

    const result = await deleteOrphans(1, serverItems, currentIds, deps);
    expect(result).toBe(0);
    expect(deps.removeItem).toHaveBeenCalledTimes(1);
    expect(deps.removeItem).toHaveBeenCalledWith({ pubId: 1, itemId: 2 });
  });
});
