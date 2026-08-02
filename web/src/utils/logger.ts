// ── Production-safe logger ──────────────────────────────────

const isDev = import.meta.env.DEV;

export function logError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const payload = {
    context,
    message: error instanceof Error ? error.message : String(error),
    ...(isDev
      ? { stack: error instanceof Error ? error.stack : undefined }
      : {}),
    ...extra,
    timestamp: new Date().toISOString(),
  };

  if (isDev) {
    console.error(`[${context}]`, error, extra ?? '');
  }

  // In production, send to error tracking service
  // Example: Sentry.captureException(error, { tags: { context }, extra });
}
