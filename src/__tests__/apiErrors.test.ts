import {
  parseApiError,
  isSafeDetail,
  extractApiError,
  extractFieldErrors,
} from '@/utils/apiErrors';

describe('isSafeDetail', () => {
  it('returns false for tracebacks and system/database exceptions', () => {
    expect(isSafeDetail('Traceback (most recent call last):')).toBe(false);
    expect(
      isSafeDetail('django.db.utils.OperationalError: connect failed'),
    ).toBe(false);
    expect(isSafeDetail('database error connection lost')).toBe(false);
    expect(isSafeDetail('OperationalError')).toBe(false);
    expect(isSafeDetail('ProgrammingError')).toBe(false);
    expect(isSafeDetail('IntegrityError')).toBe(false);
    expect(isSafeDetail('file "/app/views.py", line 15')).toBe(false);
    // Note: 'at Object.anonymous (index.js:10:5)' is a JS client-side stack
    // trace — the backend should never return it, so we do NOT sanitize it.
  });

  it('returns true for safe user-facing validation strings', () => {
    expect(isSafeDetail('El correo ya existe')).toBe(true);
    expect(isSafeDetail('Ingresa un correo válido')).toBe(true);
    expect(isSafeDetail('Revisa la línea de código en el email')).toBe(true);
    // Strings that used to be false-positived by the removed /at\s+.*:\d+/ regex:
    expect(isSafeDetail('Error en tratamiento: 3 intentos')).toBe(true);
    expect(isSafeDetail('atención: 5 días de espera')).toBe(true);
    expect(isSafeDetail('Consulta el apartado: 2')).toBe(true);
  });
});

describe('parseApiError', () => {
  it('returns default message if not an axios error', () => {
    const error = new Error('Some standard JS error');
    expect(parseApiError(error, 'Fallback message')).toBe('Fallback message');
  });

  it('maps standard status codes correctly', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 403,
        data: {},
      },
    };
    expect(parseApiError(axiosError)).toBe(
      'No tienes permiso para realizar esta acción.',
    );
  });

  it('handles field validation errors in response data', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          non_field_errors: ['Invalid credentials'],
          email: ['Este campo es obligatorio.'],
        },
      },
    };
    expect(parseApiError(axiosError)).toContain('Invalid credentials');
    expect(parseApiError(axiosError)).toContain(
      'email: Este campo es obligatorio.',
    );
  });

  it('sanitises django traceback details and returns default message', () => {
    const tracebackError = {
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          detail:
            'Traceback (most recent call last):\n  File "/app/views.py", line 12\nZeroDivisionError: division by zero',
        },
      },
    };
    expect(parseApiError(tracebackError, 'Server error')).toBe('Server error');
  });

  it('sanitises database connection error details and returns default message', () => {
    const dbError = {
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          detail:
            'django.db.utils.OperationalError: could not connect to server',
        },
      },
    };
    expect(parseApiError(dbError, 'Server error')).toBe('Server error');
  });

  it('allows safe user-facing details to pass through', () => {
    const safeError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          detail: 'El código de verificación es inválido.',
        },
      },
    };
    expect(parseApiError(safeError)).toBe(
      'El código de verificación es inválido.',
    );
  });

  it('unwraps Error.cause containing an AxiosError', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 409,
        data: { detail: 'Conflicto: Ya existe un registro con esos datos.' },
      },
    };
    const wrapped = new Error(
      'Conflicto: Ya existe un registro con esos datos.',
      {
        cause: axiosError,
      },
    );
    expect(parseApiError(wrapped)).toBe(
      'Conflicto: Ya existe un registro con esos datos.',
    );
  });

  it('unwraps cause for non-status-mapped errors', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: { email: ['Este campo es obligatorio.'] },
      },
    };
    const wrapped = new Error('Validation failed', { cause: axiosError });
    expect(parseApiError(wrapped)).toContain(
      'email: Este campo es obligatorio.',
    );
  });

  it('R3-W: non_field_errors with an unsafe traceback item does not leak', () => {
    const tracebackError = {
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          non_field_errors: [
            'Traceback (most recent call last):\n  File "/app/views.py", line 12',
          ],
        },
      },
    };
    expect(parseApiError(tracebackError, 'Server error')).toBe('Server error');
  });

  it('R3-W: a safe item next to an unsafe one in non_field_errors still surfaces', () => {
    const mixed = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          non_field_errors: [
            'Traceback (most recent call last):\n  File "/app/views.py", line 12',
            'Credenciales inválidas.',
          ],
        },
      },
    };
    const result = parseApiError(mixed);
    expect(result).toContain('Credenciales inválidas.');
    expect(result).not.toContain('Traceback');
  });

  it('R3-W: a field-key array holding a traceback does not leak', () => {
    const tracebackError = {
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          email: [
            'Traceback (most recent call last):\n  File "/app/views.py", line 99',
          ],
        },
      },
    };
    expect(parseApiError(tracebackError, 'Server error')).toBe('Server error');
  });

  it('returns a safe top-level array error body (DRF non-field errors)', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: ['Stock insuficiente para Tomate.'],
      },
    };
    expect(parseApiError(axiosError)).toBe('Stock insuficiente para Tomate.');
  });

  it('sanitises an unsafe top-level array error body to the fallback', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: ['django.db.utils.OperationalError: could not connect to server'],
      },
    };
    expect(parseApiError(axiosError, 'Server error')).toBe('Server error');
  });

  it('returns a safe string error body', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: 'El correo ya existe',
      },
    };
    expect(parseApiError(axiosError)).toBe('El correo ya existe');
  });

  it('sanitises an unsafe string error body to the fallback', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 500,
        data: 'django.db.utils.OperationalError: connect failed',
      },
    };
    expect(parseApiError(axiosError, 'Server error')).toBe('Server error');
  });

  it('sanitises an unsafe message key to the fallback', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          message: 'Traceback (most recent call last):\n  File "views.py"',
        },
      },
    };
    expect(parseApiError(axiosError, 'Server error')).toBe('Server error');
  });
});

describe('extractApiError', () => {
  it('returns the message from a plain Error', () => {
    const result = extractApiError(new Error('Algo salió mal'), []);
    expect(result).toBe('Algo salió mal');
  });

  it('returns the default message for unknown', () => {
    const result = extractApiError(null, []);
    expect(result).toBe('Error desconocido.');
  });

  it('returns the default message for undefined', () => {
    const result = extractApiError(undefined, []);
    expect(result).toBe('Error desconocido.');
  });

  it('handles an AxiosError with a string response.data', () => {
    const axiosError = {
      isAxiosError: true,
      response: { data: 'Error del servidor' },
    };
    const result = extractApiError(axiosError, []);
    expect(result).toBe('Error del servidor');
  });

  it('detects an HTML error page and logs a warning', () => {
    const html = '<!DOCTYPE html><html><body>Server Error</body></html>';
    const axiosError = {
      isAxiosError: true,
      response: { data: html, status: 500 },
    };
    const result = extractApiError(axiosError, []);
    expect(result).toBe(
      'Error interno del servidor. Revisa los logs del backend.',
    );
  });

  it('detects a Django traceback as HTML', () => {
    const html = 'Traceback (most recent call last):\n  File "views.py"';
    const axiosError = {
      isAxiosError: true,
      response: { data: html, status: 500 },
    };
    const result = extractApiError(axiosError, []);
    expect(result).toBe(
      'Error interno del servidor. Revisa los logs del backend.',
    );
  });

  it('uses field keys for validation errors', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          nombre: ['Este campo es obligatorio.'],
          descripcion: ['Mínimo 3 caracteres.'],
        },
      },
    };
    const result = extractApiError(axiosError, [
      'nombre',
      'descripcion',
      'detail',
    ]);
    expect(result).toBe('Este campo es obligatorio.');
  });

  it('uses the first matching field key', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          detail: ['Error genérico.'],
        },
      },
    };
    const result = extractApiError(axiosError, [
      'nombre',
      'abreviatura',
      'detail',
    ]);
    expect(result).toBe('Error genérico.');
  });

  it('returns data.message when present', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: { message: 'Error personalizado.' },
      },
    };
    const result = extractApiError(axiosError, []);
    expect(result).toBe('Error personalizado.');
  });

  it('W-1: sanitizes a message string containing HTML/traceback and returns the default', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          message:
            '<html><body><pre>Traceback (most recent call last)</pre></body></html>',
        },
      },
    };
    const result = extractApiError(axiosError, []);
    expect(result).toBe('Error del servidor. Intenta de nuevo.');
  });

  it('W-1: handles message as an array of strings and returns the safe item', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          message: ["Stock insuficiente para 'Tomate'. Disponible: 2."],
        },
      },
    };
    const result = extractApiError(axiosError, ['detail', 'message']);
    expect(result).toBe("Stock insuficiente para 'Tomate'. Disponible: 2.");
  });

  it('W-1: sanitizes an unsafe array item (traceback) and returns the default', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          message: [
            'Traceback (most recent call last):\n  File "/app/views.py", line 42',
          ],
        },
      },
    };
    const result = extractApiError(axiosError, ['detail', 'message']);
    expect(result).toBe('Error del servidor. Intenta de nuevo.');
  });

  it('returns the default message when there is no data', () => {
    const axiosError = {
      isAxiosError: true,
      response: { data: null },
    };
    const result = extractApiError(axiosError, []);
    expect(result).toBe('Error del servidor. Intenta de nuevo.');
  });

  it('returns the default message when no field key matches', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: { other_field: 'algo' },
      },
    };
    const result = extractApiError(axiosError, ['nombre', 'detail']);
    expect(result).toBe('Error del servidor. Intenta de nuevo.');
  });
});

describe('extractFieldErrors', () => {
  it('returns a general message for non-axios errors', () => {
    const result = extractFieldErrors(new Error('Algo salió mal'), []);
    expect(result).toEqual({ fields: {}, general: 'Algo salió mal' });
  });

  it('returns the default for unknown', () => {
    const result = extractFieldErrors(null, []);
    expect(result).toEqual({
      fields: {},
      general: 'Error desconocido.',
    });
  });

  it('returns the default when there is no response.data', () => {
    const axiosError = {
      isAxiosError: true,
      response: { data: null },
    };
    const result = extractFieldErrors(axiosError, []);
    expect(result).toEqual({
      fields: {},
      general: 'Error del servidor. Intenta de nuevo.',
    });
  });

  it('detects an HTML string body', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: '<!DOCTYPE html><html>error</html>',
        status: 500,
      },
    };
    const result = extractFieldErrors(axiosError, []);
    expect(result).toEqual({
      fields: {},
      general: 'Error interno del servidor. Revisa los logs del backend.',
    });
  });

  it('extracts per-field errors from arrays', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: { nombre: ['El nombre es obligatorio.'] },
      },
    };
    const result = extractFieldErrors(axiosError, ['nombre']);
    expect(result).toEqual({
      fields: { nombre: 'El nombre es obligatorio.' },
      general: null,
    });
  });

  it('extracts per-field errors from strings', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: { telefono: 'Número inválido.' },
      },
    };
    const result = extractFieldErrors(axiosError, ['telefono']);
    expect(result).toEqual({
      fields: { telefono: 'Número inválido.' },
      general: null,
    });
  });

  it('returns detail as general when no field keys match', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: { detail: 'Credenciales inválidas.' },
      },
    };
    const result = extractFieldErrors(axiosError, []);
    expect(result).toEqual({
      fields: {},
      general: 'Credenciales inválidas.',
    });
  });

  it('returns the first error from data when no field key matches', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: { otro_campo: ['error'] },
      },
    };
    const result = extractFieldErrors(axiosError, ['nombre']);
    expect(result).toEqual({
      fields: {},
      general: 'otro_campo: error',
    });
  });

  it('falls back to default when no field key or array entry matches', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: { foo: 'bar' },
      },
    };
    const result = extractFieldErrors(axiosError, ['nombre']);
    expect(result).toEqual({
      fields: {},
      general: 'Error del servidor. Intenta de nuevo.',
    });
  });

  it('R3-W: an unsafe `message` traceback falls back to the generic message', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          message:
            'Traceback (most recent call last):\n  File "/app/views.py", line 12\nZeroDivisionError: division by zero',
        },
      },
    };
    expect(extractFieldErrors(axiosError, [])).toEqual({
      fields: {},
      general: 'Error interno del servidor.',
    });
  });

  it('R3-W: an unsafe fieldKeys array item is excluded from fields', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          nombre: [
            'Traceback (most recent call last):\n  File "/app/views.py", line 42',
          ],
        },
      },
    };
    expect(extractFieldErrors(axiosError, ['nombre'])).toEqual({
      fields: {},
      general: 'Error del servidor. Intenta de nuevo.',
    });
  });

  it('R3-W: a safe fieldKeys item still lands when a sibling is unsafe', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          nombre: [
            'Traceback (most recent call last):\n  File "/app/views.py", line 42',
          ],
          email: ['El correo ya existe.'],
        },
      },
    };
    expect(extractFieldErrors(axiosError, ['nombre', 'email'])).toEqual({
      fields: { email: 'El correo ya existe.' },
      general: null,
    });
  });

  it('R3-W: an unsafe `{ otro_campo: [traceback] }` entry falls back instead of leaking', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          otro_campo: [
            'Traceback (most recent call last):\n  File "/app/views.py", line 7',
          ],
        },
      },
    };
    expect(extractFieldErrors(axiosError, ['nombre'])).toEqual({
      fields: {},
      general: 'Error del servidor. Intenta de nuevo.',
    });
  });
});
