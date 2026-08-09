// Shared HTTP-communication helpers used by the domain modules (waste, liquidaciones).
// Kept here so the two near-identical envelope unwraps and URL builders live in
// exactly one place — the "missing data" semantics (including null) must stay
// consistent across modules (R2-1, R4-4).

// --- Envelope -----------------------------------------------------------------

// Unwrap the {ok, data, message} envelope returned by the merma and
// liquidaciones endpoints. Throws when ok === false or data is missing —
// including data: null, which is treated as "no payload" and must not render
// an empty screen (R4-4). NOTE: business errors arriving as ok:true on a
// non-2xx HTTP status are surfaced by the axios rejection, not by this unwrap.
export function unwrapEnvelope<T>(envelope: {
  ok: boolean;
  data?: unknown;
  message?: string;
}): T {
  if (
    envelope.ok === false ||
    envelope.data === undefined ||
    envelope.data === null
  ) {
    throw new Error(envelope.message ?? 'Error en la respuesta del servidor');
  }
  return envelope.data as T;
}

// --- URL builder ---------------------------------------------------------------

// Build "<base>?key=value&..." keeping insertion order, skipping undefined and
// empty-string values so the output matches the per-module builders it replaces.
export function buildListUrl(
  base: string,
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}
