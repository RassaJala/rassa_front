import { describe, expect, it, vi } from 'vitest';
import {
  ALLOWED_IMAGE_TYPES,
  assertValidId,
  CATALOG_PAGE_SIZE,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
  PERSIST_TIMEOUT_MS,
  QUERY_RETRY,
  QUERY_STALE_TIME,
  TOAST_DISMISS_MS,
  TOAST_EXIT_MS,
  TOAST_ORPHAN_DELAY_MS,
  UPLOAD_TIMEOUT_MS,
} from './api';

describe('constants: values', () => {
  it('MAX_IMAGE_SIZE_MB is 5', () => {
    expect(MAX_IMAGE_SIZE_MB).toBe(5);
  });

  it('MAX_IMAGE_SIZE_BYTES is 5 * 1024 * 1024', () => {
    expect(MAX_IMAGE_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  it('ALLOWED_IMAGE_TYPES includes jpeg, png, webp, gif', () => {
    expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
    expect(ALLOWED_IMAGE_TYPES).toContain('image/png');
    expect(ALLOWED_IMAGE_TYPES).toContain('image/webp');
    expect(ALLOWED_IMAGE_TYPES).toContain('image/gif');
    expect(ALLOWED_IMAGE_TYPES).toHaveLength(4);
  });

  it('UPLOAD_TIMEOUT_MS is 60 seconds', () => {
    expect(UPLOAD_TIMEOUT_MS).toBe(60_000);
  });

  it('QUERY_STALE_TIME is 30 seconds', () => {
    expect(QUERY_STALE_TIME).toBe(30_000);
  });

  it('QUERY_RETRY is 3', () => {
    expect(QUERY_RETRY).toBe(3);
  });

  it('CATALOG_PAGE_SIZE is 200', () => {
    expect(CATALOG_PAGE_SIZE).toBe(200);
  });

  it('TOAST_DISMISS_MS is 3000', () => {
    expect(TOAST_DISMISS_MS).toBe(3000);
  });

  it('TOAST_EXIT_MS is 300', () => {
    expect(TOAST_EXIT_MS).toBe(300);
  });

  it('TOAST_ORPHAN_DELAY_MS is 3500', () => {
    expect(TOAST_ORPHAN_DELAY_MS).toBe(3500);
  });

  it('PERSIST_TIMEOUT_MS is 300 seconds', () => {
    expect(PERSIST_TIMEOUT_MS).toBe(300_000);
  });
});
