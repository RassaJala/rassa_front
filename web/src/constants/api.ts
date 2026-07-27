// ── Shared constants — extracted from magic numbers ────────

export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const UPLOAD_TIMEOUT_MS = 60_000;
export const QUERY_STALE_TIME = 30_000;
export const QUERY_RETRY = 3;
export const CATALOG_PAGE_SIZE = 200;
export const TOAST_DISMISS_MS = 3000;
export const TOAST_EXIT_MS = 300;

// ── ID validation guard ────────────────────────────────────

export function assertValidId(id: number, label = "ID"): asserts id is number {
  if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
    throw new Error(`Invalid ${label}: ${String(id)}`);
  }
}
