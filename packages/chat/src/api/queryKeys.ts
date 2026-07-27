// React Query key factories — shared so web and mobile hit the same cache keys (D4).

export const conversationsKey = (): ['conversations'] => ['conversations'];

export const messagesKey = (conversationId: number): ['messages', number] => [
  'messages',
  conversationId,
];

export const groupMembersKey = (
  conversationId: number,
): ['groupMembers', number] => ['groupMembers', conversationId];
