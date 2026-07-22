/**
 * Shared filter logic for admin CRUD screens (web).
 * Extracted to avoid duplication between AdminCategories and AdminUnits.
 */

export const STATUS_FILTERS = ['todos', 'activos', 'inactivos'] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const FILTER_LABELS: Record<StatusFilter, string> = {
  todos: 'Todos',
  activos: 'Activos',
  inactivos: 'Inactivos',
};

export interface FilterResult<T> {
  items: T[];
  excludedCount: number;
}

/**
 * Pure filter function — runs each item through search + status checks.
 * Invalid items are caught, logged, and excluded instead of crashing the list.
 * Returns filtered items plus a count of items excluded by error.
 */
export function filterItems<T extends { estado: boolean }>(
  items: T[],
  searchDebounced: string,
  statusFilter: StatusFilter,
  searchFields: (keyof T & string)[],
): FilterResult<T> {
  const normalizedSearch = searchDebounced.toLowerCase().trim();
  let excludedCount = 0;

  const filtered = items.filter((item) => {
    try {
      // Validate estado before using it
      if (typeof item.estado !== 'boolean') {
        console.warn('crudFilter: estado is not boolean:', item);
      }

      const matchesSearch =
        !normalizedSearch ||
        searchFields.some((fieldName) => {
          const value = (item as Record<string, unknown>)[fieldName];
          return String(value ?? '')
            .toLowerCase()
            .includes(normalizedSearch);
        });

      let matchesStatus: boolean;
      if (statusFilter === 'todos') {
        matchesStatus = true;
      } else if (statusFilter === 'activos') {
        matchesStatus = item.estado === true;
      } else {
        matchesStatus = item.estado === false;
      }

      return matchesSearch && matchesStatus;
    } catch (error) {
      excludedCount++;
      console.warn(
        'crudFilter: error filtering item, excluding it:',
        item,
        error,
      );
      return false;
    }
  });

  return { items: filtered, excludedCount };
}
