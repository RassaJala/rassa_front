/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test file for apiError utility */
import { extractApiError, extractFieldErrors } from '@/utils/apiError';

// Mock __DEV__ for tests
(global as any).__DEV__ = true;

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

describe('extractFieldErrors', () => {
  it('devuelve mensaje general para non-axios errors', () => {
    const result = extractFieldErrors(new Error('Algo salió mal'), []);

    expect(result).toEqual({ fields: {}, general: 'Algo salió mal' });
  });

  it('devuelve default para unknown', () => {
    const result = extractFieldErrors(null, []);

    expect(result).toEqual({
      fields: {},
      general: 'Error desconocido.',
    });
  });

  it('devuelve default cuando no hay response.data', () => {
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

  it('detecta HTML string data', () => {
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

  it('extrae errores por campo desde arrays', () => {
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

  it('extrae errores por campo desde strings', () => {
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

  it('retorna detail como general cuando no hay fieldKeys', () => {
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

  it('retorna primer error de data si ningún field key coincide', () => {
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

  it('cae a default si no hay fieldKeys match ni entries con arrays', () => {
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
});
