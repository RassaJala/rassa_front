import * as Sentry from '@sentry/react-native';

import { describeError, redactSensitive } from '@/common/logger';
import { sanitizeSentryError } from '@/services/sentry';

// Logger móvil seguro (R1-A): describe los errores de axios sin los headers
// (el JWT viaja en `config.headers.Authorization`) y redacta las claves que
// parecen credenciales en el contexto extra. Nunca loguear el objeto de error
// crudo.
//
// R1-D: en producción el error también se reporta a Sentry, como ya hace la
// web (web/src/utils/logger.ts), para que las fallas del módulo de mermas no
// sean invisibles al monitoreo. El evento se construye desde la descripción
// redactada y se pasa por sanitizeSentryError como red defensiva.
function buildSentryEvent(
  context: string,
  error: unknown,
  described: unknown,
  safeExtra: unknown,
): Error {
  const describedMessage =
    typeof described === 'object' &&
    described !== null &&
    'message' in described
      ? String(described.message)
      : String(described);
  const sentryEvent = Object.assign(
    new Error(`[${context}] ${describedMessage}`),
    {
      context,
      extra: safeExtra,
    },
  );
  const originalStack = error instanceof Error ? error.stack : undefined;
  if (originalStack) {
    sentryEvent.stack = originalStack;
  }
  return sentryEvent;
}

export function logError(
  context: string,
  error: unknown,
  extra?: Readonly<Record<string, unknown>>,
): void {
  const described = describeError(error);
  const safeExtra = redactSensitive(extra ?? {});

  if (__DEV__) {
    console.error(`[${context}]`, described, safeExtra);
    return;
  }

  console.warn(`[${context}]`, described, safeExtra);
  Sentry.captureException(
    sanitizeSentryError(buildSentryEvent(context, error, described, safeExtra)),
  );
}
