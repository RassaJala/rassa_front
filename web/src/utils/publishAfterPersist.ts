// ── Extracted publish-after-persist logic — testable ────────

import { logError } from './logger';

export async function publishAfterPersist(
  pubId: number,
  publishFn: (id: number) => Promise<unknown>,
  navigateFn: () => void,
  mountedRef: { readonly current: boolean },
): Promise<void> {
  try {
    await publishFn(pubId);
  } catch (originalErr) {
    logError('publishAfterPersist', originalErr, { pubId });
    throw new Error(
      'Se guardó el borrador, pero falló la publicación. Intentá publicar desde la lista.',
    );
  }
  if (mountedRef.current) navigateFn();
}
