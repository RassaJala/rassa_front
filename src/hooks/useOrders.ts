import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PedidoItemInput, PedidoOutput } from '@/services/orders';
import { createPedido } from '@/services/orders';
import type { ApiResponse } from '@/types';

/**
 * Mutation hook para crear un pedido desde el carrito.
 *
 * Invalida la lista de pedidos al completarse para que
 * OrderHistoryScreen refleje el nuevo pedido.
 */
export function useCreatePedido(): ReturnType<
  typeof useMutation<
    ApiResponse<PedidoOutput>,
    Error,
    readonly PedidoItemInput[]
  >
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: readonly PedidoItemInput[]) => createPedido(items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pedidos-cliente'] });
    },
  });
}
