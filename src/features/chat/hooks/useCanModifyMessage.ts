import { useMemo } from 'react';

import { canModifyMessage } from '@rassa/chat';
import type { CanModifyResult } from '@rassa/chat';

import type { Message } from '@/types/chat';

export function useCanModifyMessage(message: Message): CanModifyResult {
  return useMemo(() => canModifyMessage(message), [message]);
}
