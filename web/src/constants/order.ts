// ── Checkout constants ─────────────────────────────────────
// S-1 (documented debt): the backend `settings.IVA_RATE` (Decimal "0.21") is
// the source of truth, but the web app has NO settings endpoint/service to
// read it from (verified — no settings API exists in web/src or
// packages/common). This constant is therefore a manual mirror: if the rate
// changes server-side, the locally computed total here diverges from the
// amount actually charged. Do NOT add a hardcoded value elsewhere; when a
// settings endpoint becomes available, consume it here and keep the tests'
// math (25.00 → 5.25 → 30.25) derived from the same source.
export const IVA_RATE = 0.21;
