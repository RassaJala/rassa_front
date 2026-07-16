/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test file for apiError utility */
import { extractApiError } from '@/utils/apiError';

// Mock __DEV__ for tests
global.__DEV__ = true;

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
