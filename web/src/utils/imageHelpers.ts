import type { SyntheticEvent } from 'react';

/** Hide broken <img> elements — use as onError handler. */
export function hideBrokenImage(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none';
}

/** Revoke a blob URL if non-null — safe no-op for null. */
export function revokeBlobUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}
