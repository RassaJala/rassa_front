import {
  isTerminalOrderState,
  validateWasteRecord,
  WASTE_DECISION_OPTIONS,
} from './wasteRegister';

describe('WASTE_DECISION_OPTIONS', () => {
  it('snapshot guards the admin-only catalog against drift', () => {
    expect(WASTE_DECISION_OPTIONS).toMatchSnapshot();
  });
});

describe('validateWasteRecord', () => {
  const validValues = {
    pedido: { id_pedido: 1 },
    producto: { id_producto_semanal: 1 },
    cantidad: '2',
    motivo: 'Se venció',
    decision: 1,
  };

  it('rejects comentarios longer than 500 characters', () => {
    const errors = validateWasteRecord({
      ...validValues,
      comentarios: 'a'.repeat(501),
    });
    expect(errors.comentarios).toBe(
      'Los comentarios no pueden superar los 500 caracteres.',
    );
  });

  it('allows comentarios of exactly 500 characters', () => {
    const errors = validateWasteRecord({
      ...validValues,
      comentarios: 'a'.repeat(500),
    });
    expect(errors.comentarios).toBeUndefined();
  });

  it('allows empty or whitespace-only comentarios', () => {
    expect(
      validateWasteRecord({ ...validValues, comentarios: '' }).comentarios,
    ).toBeUndefined();
    expect(
      validateWasteRecord({ ...validValues, comentarios: '   ' }).comentarios,
    ).toBeUndefined();
  });
});

describe('isTerminalOrderState', () => {
  it('returns true for terminal states (entregado/cancelado)', () => {
    expect(isTerminalOrderState('entregado')).toBe(true);
    expect(isTerminalOrderState('cancelado')).toBe(true);
  });

  it('returns false for in-flight states', () => {
    expect(isTerminalOrderState('pendiente_entrega')).toBe(false);
    expect(isTerminalOrderState('pendiente')).toBe(false);
    expect(isTerminalOrderState('')).toBe(false);
  });
});
