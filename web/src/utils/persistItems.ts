// ── Extracted persist orchestration — testable via DI ───────

export interface PersistItemsDeps {
  upsertItems: (
    pubId: number,
    signal?: AbortSignal,
  ) => Promise<{
    tempIdToServerId: Map<string, number>;
    newServerIds: number[];
  }>;
  refreshSnapshot: (pubId: number) => Promise<void>;
  deleteOrphans: (
    pubId: number,
    tempIdToServerId: Map<string, number>,
    signal?: AbortSignal,
  ) => Promise<number>;
  removeItem: (pubId: number, itemId: number) => Promise<void>;
  logCleanupFailure?: (itemId: number, err: unknown) => void;
}

export async function persistItems(
  pubId: number,
  deps: PersistItemsDeps,
  signal?: AbortSignal,
): Promise<{ orphanFailures: number }> {
  let newServerIds: number[] = [];
  let orphanFailures = 0;
  let itemsSaved = false;
  try {
    const { tempIdToServerId, newServerIds: ids } = await deps.upsertItems(
      pubId,
      signal,
    );
    newServerIds = ids;
    itemsSaved = true;

    await deps.refreshSnapshot(pubId);
    orphanFailures = await deps.deleteOrphans(pubId, tempIdToServerId, signal);
  } catch (err) {
    if (itemsSaved) {
      throw new Error(
        "Los cambios se guardaron, pero no se pudo actualizar la vista. Revisá la publicación.",
      );
    }
    if (newServerIds.length > 0) {
      for (const serverId of newServerIds) {
        try {
          await deps.removeItem(pubId, serverId);
        } catch (cleanupErr) {
          deps.logCleanupFailure?.(serverId, cleanupErr);
        }
      }
    }
    throw err;
  }
  return { orphanFailures };
}
