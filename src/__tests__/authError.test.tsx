/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import { getLoginErrorMessage } from '@/utils/authError';

describe('getLoginErrorMessage', () => {
  it('devuelve el mensaje cuando es un Error', () => {
    const result = getLoginErrorMessage(new Error('Algo salió mal'));

    expect(result).toBe('Algo salió mal');
  });

  it('devuelve el string directamente', () => {
    const result = getLoginErrorMessage('Error manual');

    expect(result).toBe('Error manual');
  });

  it('serializa un objeto a JSON', () => {
    const result = getLoginErrorMessage({ campo: 'email', error: 'required' });

    expect(result).toBe('{"campo":"email","error":"required"}');
  });

  it('usa mensaje por defecto para unknown (null)', () => {
    const result = getLoginErrorMessage(null);

    expect(result).toBe(
      'No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.',
    );
  });

  it('usa mensaje por defecto para undefined', () => {
    const result = getLoginErrorMessage(undefined);

    expect(result).toBe(
      'No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.',
    );
  });

  it('usa mensaje por defecto para un número', () => {
    const result = getLoginErrorMessage(42);

    expect(result).toBe(
      'No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.',
    );
  });
});
