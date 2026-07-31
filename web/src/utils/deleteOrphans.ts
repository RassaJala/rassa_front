// ── Extracted orphan deletion — testable via DI ─────────────

export interface ServerProducto {
  id_producto_semanal: number;
}

export interface DeleteOrphansDeps {
  removeItem: (vars: { pubId: number; itemId: number }) => Promise<unknown>;
}

export async function deleteOrphans(
  pubId: number,
  serverItems: ServerProducto[],
  currentIds: Set<string>,
  deps: DeleteOrphansDeps,
  signal?: AbortSignal,
): Promise<number> {
  let failures = 0;

  for (const existing of serverItems) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const existingId = String(existing.id_producto_semanal);
    if (!currentIds.has(existingId)) {
      try {
        await deps.removeItem({
          pubId,
          itemId: existing.id_producto_semanal,
        });
      } catch {
        failures++;
      }
    }
  }
  return failures;
}
