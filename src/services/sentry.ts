// Sanitizers for Sentry captures. There is no `Sentry.init` in this app yet
// (no DSN configured), but screens already call `Sentry.captureException`, so
// the raw error is scrubbed at the capture site. The helpers below are also
// ready to wire into a future `Sentry.init({ beforeSend })`.

// Headers that may carry credentials. Matched case-insensitively because
// axios/AxiosHeaders normalize casing differently across environments
// (Authorization vs authorization, cookie vs Cookie, set-cookie vs Set-Cookie).
const SENSITIVE_HEADER_RE =
  /^(authorization|proxy-authorization|cookie|set-cookie)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Returns the headers with every credential-carrying key removed. The result
// is always a fresh object: the input (and the error it belongs to) is never
// mutated.
function redactSensitiveHeaders(headers: unknown): unknown {
  if (!isRecord(headers)) {
    return headers;
  }
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!SENSITIVE_HEADER_RE.test(key)) {
      redacted[key] = value;
    }
  }
  return redacted;
}

function redactConfig(
  config: Record<string, unknown>,
): Record<string, unknown> {
  return { ...config, headers: redactSensitiveHeaders(config.headers) };
}

function redactResponse(
  response: Record<string, unknown>,
): Record<string, unknown> {
  const clone = { ...response };
  if (isRecord(response.config)) {
    clone.config = redactConfig(response.config);
  }
  clone.headers = redactSensitiveHeaders(response.headers);
  return clone;
}

function redactRequest(
  request: Record<string, unknown>,
): Record<string, unknown> {
  const clone = { ...request };
  clone.headers = redactSensitiveHeaders(request.headers);
  // On React Native, `error.request` is the XHR polyfill: axios writes every
  // config header (including the JWT Authorization) into its own enumerable
  // `_headers` property via `setRequestHeader`, and the received headers land
  // in `_lowerCaseResponseHeaders` and `responseHeaders`. All three are copied
  // by the spread above, so they must be scrubbed here or credentials leak on
  // every native ERR_NETWORK/ECONNABORTED/ETIMEDOUT capture (and on HTTP-error
  // captures where the raw response headers include Set-Cookie). The polyfill
  // resets `responseHeaders` to undefined after the request, which
  // `redactSensitiveHeaders` passes through untouched.
  clone._headers = redactSensitiveHeaders(request._headers);
  clone._lowerCaseResponseHeaders = redactSensitiveHeaders(
    request._lowerCaseResponseHeaders,
  );
  clone.responseHeaders = redactSensitiveHeaders(request.responseHeaders);
  return clone;
}

// The raw axios error carries the JWT Authorization header (and may hold
// cookies) on `config.headers`, on `request.headers` and, via the shared
// reference, on `response.config.headers`; on React Native the request XHR
// additionally keeps them in its own `_headers` and `_lowerCaseResponseHeaders`
// properties. Shipping any of these to Sentry would leak credentials. This
// returns a defensive clone with every credential-carrying header scrubbed.
// The original error stays intact for local handling.
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

  const sanitized: Record<string, unknown> = { ...error };
  if (config !== null) {
    sanitized.config = redactConfig(config);
  }
  if (isRecord(error.response)) {
    sanitized.response = redactResponse(error.response);
  }
  if (isRecord(error.request)) {
    sanitized.request = redactRequest(error.request);
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
  const request = event.request;
  if (request?.headers !== undefined) {
    request.headers = redactSensitiveHeaders(request.headers) as Record<
      string,
      unknown
    >;
  }
  return event;
}
