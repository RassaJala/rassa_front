import type { ApiResponse } from '@/types';

export function parseApiList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (typeof data === 'object' && data !== null && 'data' in data) {
    const inner = (data as ApiResponse<T[] | { results: T[] }>).data;
    if (Array.isArray(inner)) return inner;
    if (typeof inner === 'object' && inner !== null && 'results' in inner) {
      const results = (inner as { results: T[] }).results;
      if (Array.isArray(results)) return results;
    }
  }

  if (typeof data === 'object' && data !== null && 'results' in data) {
    const results = (data as { results: T[] }).results;
    if (Array.isArray(results)) return results;
  }

  return [];
}
