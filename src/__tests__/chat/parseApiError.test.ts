import { parseApiError } from '@/common/apiErrors';

interface AxiosLikeError extends Error {
  isAxiosError?: boolean;
  response?: { status: number; data: unknown };
}

function makeAxiosError(opts: {
  status: number;
  message: string;
  data?: unknown;
}): AxiosLikeError {
  const err: AxiosLikeError = new Error(opts.message);
  err.isAxiosError = true;
  err.response = { status: opts.status, data: opts.data };
  return err;
}

describe('parseApiError', () => {
  it('never surfaces the raw axios "Request failed with status code 500" text', () => {
    // CRITICAL #1 (#82): a real HTTP 500 must not leak the raw English axios
    // message to the UI; the interceptor routes every non-401 failure here.
    const err = makeAxiosError({
      status: 500,
      message: 'Request failed with status code 500',
      data: '<html><body>Internal Server Error</body></html>',
    });

    const msg = parseApiError(
      err,
      'No se pudo iniciar el chat. Intenta de nuevo.',
    );

    expect(msg).not.toBe('Request failed with status code 500');
    expect(msg).not.toContain('<html');
    expect(msg).toMatch(/no se pudo iniciar|Error interno/i);
  });

  it('surfaces the safe backend message when present', () => {
    const err = makeAxiosError({
      status: 422,
      message: 'Request failed with status code 422',
      data: { detail: 'El chat ya existe.' },
    });

    expect(parseApiError(err)).toBe('El chat ya existe.');
  });

  it('hides DB/traceback details from backend envelope text', () => {
    const err = makeAxiosError({
      status: 400,
      message: 'Request failed with status code 400',
      data: {
        detail:
          'IntegrityError: duplicate key value violates unique constraint',
      },
    });

    const msg = parseApiError(err);
    expect(msg).not.toContain('IntegrityError');
    expect(msg).not.toContain('duplicate key');
    // Either the safe fallback or a generic message — never the raw detail.
    expect(msg).not.toBe('Request failed with status code 400');
  });

  it('returns the provided fallback for unknown non-axios errors', () => {
    expect(
      parseApiError(
        new Error('boom'),
        'No se pudo iniciar el chat. Intenta de nuevo.',
      ),
    ).toBe('No se pudo iniciar el chat. Intenta de nuevo.');
  });
});
