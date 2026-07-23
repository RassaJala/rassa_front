// ponytail: mock data — replace with real API call when backend is running

import type { OrderStatusHistory } from '@/types';

export function getMockOrderHistory(
  orderId: number,
): OrderStatusHistory[] {
  // Return different data based on order ID so different IDs show different histories
  const base = new Date();
  base.setHours(base.getHours() - 48);

  if (orderId % 3 === 0) {
    return []; // empty history for some IDs
  }

  return [
    {
      id: 1,
      previous_status: null,
      new_status: 'pending',
      changed_at: new Date(base.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      changed_by: null,
    },
    {
      id: 2,
      previous_status: 'pending',
      new_status: 'confirmed',
      changed_at: new Date(base.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
      changed_by: 'admin@rassa.com',
    },
    {
      id: 3,
      previous_status: 'confirmed',
      new_status: 'in_preparation',
      changed_at: new Date(
        base.getTime() - 1 * 60 * 60 * 1000,
      ).toISOString(),
      changed_by: 'admin@rassa.com',
    },
    {
      id: 4,
      previous_status: 'in_preparation',
      new_status: 'shipped',
      changed_at: new Date(
        base.getTime() - 0.5 * 60 * 60 * 1000,
      ).toISOString(),
      changed_by: 'operador@rassa.com',
    },
    {
      id: 5,
      previous_status: 'shipped',
      new_status: 'delivered',
      changed_at: base.toISOString(),
      changed_by: null,
    },
  ];
}
