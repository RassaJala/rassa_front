// ── Shared constants — extracted from magic numbers ────────

export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
export const UPLOAD_TIMEOUT_MS = 60_000;
export const QUERY_STALE_TIME = 30_000;
export const QUERY_RETRY = 3;
export const CATALOG_PAGE_SIZE = 200;
export const TOAST_DISMISS_MS = 3000;
export const TOAST_EXIT_MS = 300;
export const TOAST_ORPHAN_DELAY_MS = 3500;
export const PERSIST_TIMEOUT_MS = 300_000;

export const QUERY_OPTIONS = {
  staleTime: QUERY_STALE_TIME,
  retry: QUERY_RETRY,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

// ── ID validation guard ────────────────────────────────────

export function assertValidId(id: number, label = 'ID'): asserts id is number {
  if (
    !Number.isFinite(id) ||
    id <= 0 ||
    !Number.isInteger(id) ||
    id > Number.MAX_SAFE_INTEGER
  ) {
    throw new Error(`Invalid ${label}: ${String(id)}`);
  }
}
