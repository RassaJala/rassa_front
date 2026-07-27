import { parseApiError } from '@/utils/apiErrors';

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
