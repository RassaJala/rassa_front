// ── Extracted publish-after-persist logic — testable ────────

export async function publishAfterPersist(
  pubId: number,
  publishFn: (id: number) => Promise<unknown>,
  navigateFn: () => void,
  isMounted: boolean,
): Promise<void> {
  try {
    await publishFn(pubId);
  } catch {
    throw new Error(
      "Se guardó el borrador, pero falló la publicación. Intentá publicar desde la lista.",
    );
  }
  if (isMounted) navigateFn();
}
