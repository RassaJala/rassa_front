import { useMemo } from 'react';

import type { Message } from '@/types/chat';

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface CanModifyResult {
  canEdit: boolean;
  canDelete: boolean;
  timeRemainingMs: number;
}

export function useCanModifyMessage(message: Message): CanModifyResult {
  return useMemo(() => {
    const created = new Date(message.creado_en).getTime();
    const elapsed = Date.now() - created;
    const remaining = Math.max(0, EDIT_WINDOW_MS - elapsed);

    return {
      canEdit: remaining > 0,
      canDelete: remaining > 0,
      timeRemainingMs: remaining,
    };
  }, [message.creado_en]);
}
