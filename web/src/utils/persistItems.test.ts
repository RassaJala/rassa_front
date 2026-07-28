import { describe, expect, it, vi } from 'vitest';

import { persistItems, type PersistItemsDeps } from './persistItems';
import { publishAfterPersist } from './publishAfterPersist';

// ── Helpers ──────────────────────────────────────────────────

function makeDeps(overrides: Partial<PersistItemsDeps> = {}): PersistItemsDeps {
  return {
    upsertItems: vi.fn().mockResolvedValue({
      tempIdToServerId: new Map([['local_1', 10]]),
      newServerIds: [10],
    }),
    refreshSnapshot: vi.fn().mockResolvedValue(undefined),
    deleteOrphans: vi.fn().mockResolvedValue(0),
    removeItem: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── persistItems ─────────────────────────────────────────────

describe('persistItems', () => {
  it('returns orphanFailures from deleteOrphans', async () => {
    const deps = makeDeps({
      deleteOrphans: vi.fn().mockResolvedValue(3),
    });
    const result = await persistItems(1, deps);
    expect(result.orphanFailures).toBe(3);
  });

  it('calls upsertItems → refreshSnapshot → deleteOrphans in order', async () => {
    const callOrder: string[] = [];
    const deps = makeDeps({
      upsertItems: vi.fn().mockImplementation(async () => {
        callOrder.push('upsert');
        return {
          tempIdToServerId: new Map([['local_1', 10]]),
          newServerIds: [10],
        };
      }),
      refreshSnapshot: vi.fn().mockImplementation(async () => {
        callOrder.push('refresh');
      }),
      deleteOrphans: vi.fn().mockImplementation(async () => {
        callOrder.push('orphans');
        return 0;
      }),
    });

    await persistItems(1, deps);
    expect(callOrder).toEqual(['upsert', 'refresh', 'orphans']);
  });

  it('throws user-friendly error when refreshSnapshot fails after items saved', async () => {
    const deps = makeDeps({
      refreshSnapshot: vi.fn().mockRejectedValue(new Error('network timeout')),
    });

    await expect(persistItems(1, deps)).rejects.toThrow(
      'Los cambios se guardaron, pero no se pudo actualizar la vista. Revisá la publicación.',
    );
  });

  it('throws user-friendly error when deleteOrphans fails after items saved', async () => {
    const deps = makeDeps({
      deleteOrphans: vi.fn().mockRejectedValue(new Error('orphan error')),
    });

    await expect(persistItems(1, deps)).rejects.toThrow(
      'Los cambios se guardaron, pero no se pudo actualizar la vista. Revisá la publicación.',
    );
  });

  it('does NOT call removeItem when items were saved but snapshot fails', async () => {
    const removeItem = vi.fn();
    const deps = makeDeps({
      refreshSnapshot: vi.fn().mockRejectedValue(new Error('fail')),
      removeItem,
    });

    await expect(persistItems(1, deps)).rejects.toThrow();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('propagates upsertItems error when no items were saved', async () => {
    const removeItem = vi.fn();
    const deps = makeDeps({
      upsertItems: vi.fn().mockRejectedValue(new Error('network error')),
      removeItem,
    });

    await expect(persistItems(1, deps)).rejects.toThrow('network error');
    // Rollback path is unreachable: when upsertItems throws, newServerIds
    // is never assigned (destructuring fails), so newServerIds stays [].
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('passes abort signal to upsertItems', async () => {
    const controller = new AbortController();
    const upsertItems = vi.fn().mockResolvedValue({
      tempIdToServerId: new Map(),
      newServerIds: [],
    });
    const deps = makeDeps({ upsertItems });

    await persistItems(1, deps, controller.signal);
    expect(upsertItems).toHaveBeenCalledWith(1, controller.signal);
  });

  it('passes abort signal to deleteOrphans', async () => {
    const controller = new AbortController();
    const deleteOrphans = vi.fn().mockResolvedValue(0);
    const deps = makeDeps({ deleteOrphans });

    await persistItems(1, deps, controller.signal);
    expect(deleteOrphans).toHaveBeenCalledWith(
      1,
      expect.any(Map),
      controller.signal,
    );
  });

  it('returns 0 orphanFailures when no orphans exist', async () => {
    const deps = makeDeps();
    const result = await persistItems(1, deps);
    expect(result.orphanFailures).toBe(0);
  });

  it('continues even when individual orphan deletions fail', async () => {
    let callCount = 0;
    const deps = makeDeps({
      deleteOrphans: vi.fn().mockImplementation(async () => {
        callCount++;
        return 2;
      }),
    });

    const result = await persistItems(1, deps);
    expect(result.orphanFailures).toBe(2);
  });
});

// ── publishAfterPersist ──────────────────────────────────────

describe('publishAfterPersist', () => {
  it('calls publishFn and navigateFn on success', async () => {
    const publishFn = vi.fn().mockResolvedValue(undefined);
    const navigateFn = vi.fn();

    await publishAfterPersist(1, publishFn, navigateFn, true);

    expect(publishFn).toHaveBeenCalledWith(1);
    expect(navigateFn).toHaveBeenCalled();
  });

  it('does NOT navigate when component is unmounted', async () => {
    const publishFn = vi.fn().mockResolvedValue(undefined);
    const navigateFn = vi.fn();

    await publishAfterPersist(1, publishFn, navigateFn, false);

    expect(publishFn).toHaveBeenCalledWith(1);
    expect(navigateFn).not.toHaveBeenCalled();
  });

  it('throws specific error when publishFn fails (partial failure)', async () => {
    const publishFn = vi.fn().mockRejectedValue(new Error('server 500'));
    const navigateFn = vi.fn();

    await expect(
      publishAfterPersist(1, publishFn, navigateFn, true),
    ).rejects.toThrow(
      'Se guardó el borrador, pero falló la publicación. Intentá publicar desde la lista.',
    );
    expect(navigateFn).not.toHaveBeenCalled();
  });

  it('throws specific error even when publishFn throws non-Error', async () => {
    const publishFn = vi.fn().mockRejectedValue('string error');
    const navigateFn = vi.fn();

    await expect(
      publishAfterPersist(1, publishFn, navigateFn, true),
    ).rejects.toThrow(
      'Se guardó el borrador, pero falló la publicación. Intentá publicar desde la lista.',
    );
  });

  it('calls publishFn with the correct pubId', async () => {
    const publishFn = vi.fn().mockResolvedValue(undefined);
    const navigateFn = vi.fn();

    await publishAfterPersist(42, publishFn, navigateFn, true);

    expect(publishFn).toHaveBeenCalledWith(42);
  });
});
