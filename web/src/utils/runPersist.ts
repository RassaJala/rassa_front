import { withTimeout } from './withTimeout';
import { PERSIST_TIMEOUT_MS, TOAST_ORPHAN_DELAY_MS } from '../constants/api';
import { extractApiError } from './apiErrors';
import { logError } from './logger';
import type { Publicacion } from '../services/publications';

export interface RunPersistDeps {
  savingRef: { current: boolean };
  abortRef: { current: AbortController | null };
  mountedRef: { current: boolean };
  pubRef: { current: Publicacion | null };
  createFn: () => Promise<{ data: Publicacion }>;
  persistItemsFn: (
    pubId: number,
    signal?: AbortSignal,
  ) => Promise<{
    orphanFailures: number;
    tempIdToServerId: Map<string, number>;
  }>;
  onSaving: (v: boolean) => void;
  onError: (msg: string | null) => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
  onTempIdSync: (
    updater: (
      prev: Array<{ tempId: string; isNew: boolean }>,
    ) => Array<{ tempId: string; isNew: boolean }>,
  ) => void;
}

export interface RunPersistOptions {
  successMsg: string;
  afterPersist?: (pubId: number) => Promise<void>;
}

export async function runPersist(
  deps: RunPersistDeps,
  opts: RunPersistOptions,
): Promise<void> {
  if (deps.savingRef.current) return;
  deps.savingRef.current = true;
  deps.onSaving(true);

  const controller = new AbortController();
  deps.abortRef.current = controller;

  try {
    await withTimeout(
      (async () => {
        if (controller.signal.aborted) return;
        deps.onError(null);

        let pub = deps.pubRef.current;
        if (!pub) {
          const result = await deps.createFn();
          pub = result.data;
          deps.pubRef.current = pub;
        }
        if (!pub) {
          if (deps.mountedRef.current) {
            deps.onError('No se pudo crear la publicación.');
          }
          return;
        }

        const { orphanFailures, tempIdToServerId } = await deps.persistItemsFn(
          pub.id_publicacion,
          controller.signal,
        );

        deps.onTempIdSync((prev) =>
          prev.map((i) => {
            const serverId = tempIdToServerId.get(i.tempId);
            if (serverId !== undefined) {
              return { ...i, tempId: String(serverId), isNew: false };
            }
            return i;
          }),
        );

        await opts.afterPersist?.(pub.id_publicacion);

        if (deps.mountedRef.current) {
          deps.onToast(opts.successMsg, 'success');
          if (orphanFailures > 0) {
            setTimeout(() => {
              if (deps.mountedRef.current) {
                deps.onToast(
                  `${orphanFailures} producto${orphanFailures !== 1 ? 's' : ''} antiguo${orphanFailures !== 1 ? 's' : ''} no se pudo${orphanFailures !== 1 ? 'ron' : ''} eliminar.`,
                  'error',
                );
              }
            }, TOAST_ORPHAN_DELAY_MS);
          }
        }
      })(),
      PERSIST_TIMEOUT_MS,
      controller,
    );
  } catch (err) {
    if (controller.signal.aborted) {
      if (deps.mountedRef.current) {
        deps.onError(null);
        deps.onToast('Operación cancelada.', 'error');
      }
      return;
    }
    if (err instanceof Error && err.message === 'timeout') {
      if (deps.mountedRef.current) {
        deps.onError('La operación tardó demasiado. Intentá de nuevo.');
      }
    } else {
      logError('publications.persist', err);
      if (deps.mountedRef.current) {
        deps.onError(extractApiError(err, ['detail', 'message']));
      }
    }
  } finally {
    deps.abortRef.current = null;
    deps.savingRef.current = false;
    if (deps.mountedRef.current) deps.onSaving(false);
  }
}
