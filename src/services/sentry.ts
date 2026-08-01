// Sanitizers for Sentry captures. There is no `Sentry.init` in this app yet
// (no DSN configured), but screens already call `Sentry.captureException`, so
// the raw error is scrubbed at the capture site. The helpers below are also
// ready to wire into a future `Sentry.init({ beforeSend })`.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// The raw axios error's `config.headers` carries the JWT Authorization header
// (and may hold cookies); shipping it to Sentry would leak credentials. This
// returns a shallow, defensive clone with the headers scrubbed entirely — the
// original error stays intact for local handling.
export function sanitizeSentryError(error: unknown): unknown {
  if (!isRecord(error)) {
    return error;
  }

  const config = isRecord(error.config) ? { ...error.config } : null;
  const isAxiosLike =
    error.isAxiosError === true ||
    (config !== null && config.headers !== undefined);

  if (!isAxiosLike) {
    return error;
  }

  if (config !== null) {
    delete config.headers;
  }

  const sanitized: Record<string, unknown> = { ...error };
  if (config !== null) {
    sanitized.config = config;
  }
  return sanitized;
}

// Drop-in for a future `Sentry.init({ beforeSend: sentryBeforeSend })`. The
// SDK populates `event.request.headers` with the outgoing request headers,
// which include the Authorization header and cookies. The type is kept loose
// on purpose so the SDK's own event type can be passed without friction.
export function sentryBeforeSend(event: {
  request?: { headers?: Record<string, unknown> };
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}): typeof event | null {
  const headers = event.request?.headers;
  if (headers !== undefined) {
    delete headers.Authorization;
    delete headers.cookie;
  }
  return event;
}
