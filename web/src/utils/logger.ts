import * as Sentry from '@sentry/react';

import { describeError, redactSensitive } from '@/common/logger';

// ── Production-safe logger ──────────────────────────────────

const isDev = import.meta.env.DEV;

// En producción no logueamos el objeto de error crudo: un AxiosError trae
// `config.headers.Authorization` (el JWT) y exponerlo en consola es una fuga.
// describeError/redactSensitive viven en @/common/logger y se comparten con la
// app móvil (R1-A), para que ambas plataformas sancionen errores igual.

export function logError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  if (isDev) {
    console.error(`[${context}]`, error, extra ?? '');
    return;
  }

  const described = describeError(error);
  const safeExtra = redactSensitive(extra ?? {});

  console.warn(`[${context}]`, described, safeExtra);

  const originalStack = error instanceof Error ? error.stack : undefined;
  const sentryEvent = Object.assign(
    new Error(
      `[${context}] ${typeof described === 'object' && described !== null && 'message' in described ? String((described as { message: unknown }).message) : String(described)}`,
    ),
    { context, extra: safeExtra },
  );
  if (originalStack) {
    sentryEvent.stack = originalStack;
  }
  Sentry.captureException(sentryEvent);
}
