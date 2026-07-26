// Pure date formatters — previously duplicated in ChatBubble / ConversationItem (D4).
// NOTE: uses new Date() with the host timezone; RN and browser may differ.
// Inherited behavior — if cross-platform parity is needed, pin an explicit TZ.

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimestamp(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) {
    return date.toLocaleDateString('es-MX', { weekday: 'short' });
  }
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
  });
}
