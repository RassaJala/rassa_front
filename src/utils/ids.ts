// ── Defensive ID guard ─────────────────────────────────────
// Validates integer format only — NOT an IDOR guard.
// Real ownership checks (request.user == resource.fk_agricultor) belong in
// the Django backend. This is a client-side safety net against malformed IDs.
export function assertValidId(id: number, label: string): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${label} must be a positive integer, got ${String(id)}`);
  }
}
