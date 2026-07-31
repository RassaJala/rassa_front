import { canModifyMessage } from '@rassa/chat';
import type { CanModifyResult, Message } from '@rassa/chat';

export function useCanModifyMessage(message: Message): CanModifyResult {
  return canModifyMessage(message);
}
