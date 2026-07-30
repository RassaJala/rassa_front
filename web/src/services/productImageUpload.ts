import type { AxiosRequestConfig } from 'axios';

import api from './api';

function sanitizeError(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Error desconocido al subir la imagen';
  // Strip anything that looks like a filesystem path
  return msg.replace(/[A-Za-z]:\\[^\s,)]+/g, '[ruta]');
}

async function uploadOne(
  productId: number,
  file: File,
  esPrincipal: boolean,
  signal?: AbortSignal,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const fd = new FormData();
      fd.append('imagen', file);
      fd.append('es_principal', String(esPrincipal));
      const cfg: AxiosRequestConfig = {
        headers: { 'Content-Type': null },
      };
      if (signal) cfg.signal = signal;
      await api.post(`/productos/${productId}/imagen/`, fd, cfg);
      return;
    } catch (imgErr) {
      if (imgErr instanceof DOMException && imgErr.name === 'AbortError') {
        throw imgErr;
      }
      if (attempt === 1) throw new Error(sanitizeError(imgErr));
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 1000 * (attempt + 1));
        const onAbort = () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
      });
    }
  }
}

export async function uploadImage(
  productId: number,
  file: File,
  signal?: AbortSignal,
): Promise<void> {
  return uploadOne(productId, file, true, signal);
}

export async function uploadProductImages(
  productId: number,
  files: File[],
  signal?: AbortSignal,
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    await uploadOne(productId, files[i]!, i === 0, signal);
  }
}
