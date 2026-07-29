// Pure chat rules — extracted from mobile useCanModifyMessage (D5).
// No role/visibility rules: the backend enforces them; duplicating is YAGNI.

import type { Message } from './types';

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export interface CanModifyResult {
  canEdit: boolean;
  canDelete: boolean;
  timeRemainingMs: number;
}

// ponytail: plan §3 lists `canModifyMessage(message, userId, now?)` but the
// existing hook never used a userId (authorship is gated in ChatBubble via
// useAuth). Adding a userId gate would change behavior and break the 74-test
// "no behavioral change" acceptance. `now` stays injectable for testability.
export function canModifyMessage(
  message: Message,
  now: number = Date.now(),
): CanModifyResult {
  const created = new Date(message.creado_en).getTime();
  const elapsed = now - created;
  const remaining = Math.max(0, EDIT_WINDOW_MS - elapsed);
  return {
    canEdit: remaining > 0,
    canDelete: remaining > 0,
    timeRemainingMs: remaining,
  };
}
