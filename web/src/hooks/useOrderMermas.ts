import { useQuery } from '@tanstack/react-query';

import type { MermaDePedido, MermaDePedidoPublic } from '@/common/waste';
import { toPublicMerma, unwrapOrderMermas } from '@/common/waste';
import api from '~/services/api';

interface UseOrderMermasOptions {
  readonly publicView?: boolean;
}

/**
 * Loads the mermas of one order from GET /mermas/?fk_pedido={id}.
 *
 * The query is the single source of truth shared by both web order views; the
 * pure envelope parsing lives in packages/common (unit-testable without
 * react-query). When `publicView` is true the payload is projected to
 * `MermaDePedidoPublic` (strips internal `comentarios` and the PII-laden
 * `pedido_info`) BEFORE it is placed in the React Query cache. Never returns
 * undefined/null — it always returns an array (empty when disabled/failed).
 */
export function useOrderMermas(
  orderId: number,
  options: UseOrderMermasOptions = {},
): { readonly mermas: readonly (MermaDePedido | MermaDePedidoPublic)[] } {
  const { publicView = false } = options;
  const { data } = useQuery<(MermaDePedido | MermaDePedidoPublic)[]>({
    queryKey: ['mermas', orderId] as const,
    queryFn: async () => {
      const response = await api.get<{
        data?: { results?: MermaDePedido[] };
        results?: MermaDePedido[];
      }>('/mermas/', { params: { fk_pedido: orderId } });
      const mermas = unwrapOrderMermas(response.data);
      return publicView ? mermas.map(toPublicMerma) : mermas;
    },
    enabled: orderId > 0,
    retry: false,
    staleTime: 30_000,
  });
  return { mermas: data ?? [] };
}
