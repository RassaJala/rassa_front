import { canModifyMessage } from '@rassa/chat';
import type { CanModifyResult } from '@rassa/chat';

import type { Message } from '@/types/chat';

export function useCanModifyMessage(message: Message): CanModifyResult {
  return canModifyMessage(message);
}
