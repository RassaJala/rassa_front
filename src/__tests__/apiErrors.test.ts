import { parseApiError, isSafeDetail, extractApiError } from '@/utils/apiErrors';

// Mock __DEV__ for tests
(global as any).__DEV__ = true;

describe('isSafeDetail', () => {
  it('returns false for tracebacks and system/database exceptions', () => {
    expect(isSafeDetail('Traceback (most recent call last):')).toBe(false);
    expect(isSafeDetail('django.db.utils.OperationalError: connect failed')).toBe(false);
    expect(isSafeDetail('database error connection lost')).toBe(false);
    expect(isSafeDetail('OperationalError')).toBe(false);
    expect(isSafeDetail('ProgrammingError')).toBe(false);
    expect(isSafeDetail('IntegrityError')).toBe(false);
    expect(isSafeDetail('file "/app/views.py", line 15')).toBe(false);
    expect(isSafeDetail('at Object.anonymous (index.js:10:5)')).toBe(false);
  });

  it('returns true for safe user-facing validation strings', () => {
    expect(isSafeDetail('El correo ya existe')).toBe(true);
    expect(isSafeDetail('Ingresa un correo válido')).toBe(true);
    expect(isSafeDetail('Revisa la línea de código en el email')).toBe(true);
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
});

describe('extractApiError', () => {
  it('devuelve mensaje de un Error normal', () => {
    const result = extractApiError(new Error('Algo salió mal'), []);
    expect(result).toBe('Algo salió mal');
  });

  it('devuelve mensaje por defecto para unknown', () => {
    const result = extractApiError(null, []);
    expect(result).toBe('Error desconocido.');
  });

  it('devuelve mensaje por defecto para undefined', () => {
    const result = extractApiError(undefined, []);
    expect(result).toBe('Error desconocido.');
  });

  it('maneja AxiosError con response.data string', () => {
    const axiosError = {
      isAxiosError: true,
      response: { data: 'Error del servidor' },
    };
    const result = extractApiError(axiosError, []);
    expect(result).toBe('Error del servidor');
  });

  it('detecta HTML error page y loggea', () => {
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

  it('detecta Django traceback como HTML', () => {
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

  it('usa field keys para errores de validación', () => {
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

  it('usa el primer field key que encuentra', () => {
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

  it('devuelve data.message si existe', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: { message: 'Error personalizado.' },
      },
    };
    const result = extractApiError(axiosError, []);
    expect(result).toBe('Error personalizado.');
  });

  it('devuelve mensaje por defecto si no hay data', () => {
    const axiosError = {
      isAxiosError: true,
      response: { data: null },
    };
    const result = extractApiError(axiosError, []);
    expect(result).toBe('Error del servidor. Intenta de nuevo.');
  });

  it('devuelve mensaje por defecto si falla match de field keys', () => {
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
