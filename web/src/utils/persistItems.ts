// ── Extracted persist orchestration — testable via DI ───────

export interface PersistItemsDeps {
  upsertItems: (
    pubId: number,
    signal?: AbortSignal,
  ) => Promise<{
    tempIdToServerId: Map<string, number>;
    newServerIds: number[];
    updatedServerIds: number[];
    failedUploads: number;
  }>;
  refreshSnapshot: (pubId: number) => Promise<void>;
  deleteOrphans: (
    pubId: number,
    tempIdToServerId: Map<string, number>,
    signal?: AbortSignal,
  ) => Promise<number>;
  removeItem: (pubId: number, itemId: number) => Promise<unknown>;
  logCleanupFailure?: (itemId: number, err: unknown) => void;
}

export async function persistItems(
  pubId: number,
  deps: PersistItemsDeps,
  signal?: AbortSignal,
): Promise<{ orphanFailures: number; failedUploads: number }> {
  let newServerIds: number[] = [];
  let updatedServerIds: number[] = [];
  let orphanFailures = 0;
  let failedUploads = 0;
  let itemsSaved = false;
  try {
    const {
      tempIdToServerId,
      newServerIds: ids,
      updatedServerIds: updatedIds,
      failedUploads: failedUploadsCount,
    } = await deps.upsertItems(pubId, signal);
    newServerIds = ids;
    updatedServerIds = updatedIds;
    failedUploads = failedUploadsCount;
    itemsSaved = true;

    await deps.refreshSnapshot(pubId);
    orphanFailures = await deps.deleteOrphans(pubId, tempIdToServerId, signal);
  } catch (err) {
    if (itemsSaved) {
      throw new Error(
        'Los cambios se guardaron, pero no se pudo actualizar la vista. Revisá la publicación.',
        { cause: err },
      );
    }
    const messages: string[] = [];
    if (newServerIds.length > 0) {
      let deletedCount = 0;
      for (const serverId of newServerIds) {
        try {
          await deps.removeItem(pubId, serverId);
          deletedCount++;
        } catch (cleanupErr) {
          deps.logCleanupFailure?.(serverId, cleanupErr);
        }
      }
      if (deletedCount > 0) {
        messages.push(
          `${deletedCount} producto${deletedCount !== 1 ? 's' : ''} creado${deletedCount !== 1 ? 's' : ''} fue${deletedCount !== 1 ? 'ron' : ''} eliminado${deletedCount !== 1 ? 's' : ''}.`,
        );
      }
    }
    if (updatedServerIds.length > 0) {
      messages.push(
        `${updatedServerIds.length} producto${updatedServerIds.length !== 1 ? 's' : ''} actualizado${updatedServerIds.length !== 1 ? 's' : ''} necesita${updatedServerIds.length !== 1 ? 'n' : ''} revisión manual (IDs: ${updatedServerIds.join(', ')}).`,
      );
    }
    if (messages.length > 0) {
      throw new Error(messages.join(' '), { cause: err });
    }
    throw err;
  }
  return { orphanFailures, failedUploads };
}
