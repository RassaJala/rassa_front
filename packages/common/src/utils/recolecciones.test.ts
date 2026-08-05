import {
  addDays,
  buildDuplicateKeys,
  esRecoleccionDuplicada,
  isValidFecha,
  isValidFechaFormato,
  isValidHora,
  normalizeHora,
  parseFecha,
  toDateString,
  todayString,
  validateProgramarForm,
} from './recolecciones';

describe('toDateString', () => {
  it('zero-pads month and day', () => {
    const date = new Date(Date.UTC(2026, 0, 1));
    expect(toDateString(date)).toBe('2026-01-01');
  });

  it('formats end-of-year correctly', () => {
    const date = new Date(Date.UTC(2026, 11, 31));
    expect(toDateString(date)).toBe('2026-12-31');
  });

  it('uses UTC components', () => {
    const date = new Date('2026-06-15T23:00:00-05:00');
    expect(toDateString(date)).toBe('2026-06-16');
  });
});

describe('todayString', () => {
  it('uses local date components', () => {
    const result = todayString();
    expect(isValidFechaFormato(result)).toBe(true);
  });
});

describe('parseFecha', () => {
  it('returns null for invalid date', () => {
    expect(parseFecha('2026-02-31')).toBeNull();
  });

  it('parses a valid date', () => {
    const result = parseFecha('2026-08-10');
    expect(result).toBeInstanceOf(Date);
    expect(toDateString(result!)).toBe('2026-08-10');
  });

  it('handles leap year correctly', () => {
    const result = parseFecha('2024-02-29');
    expect(result).not.toBeNull();
    expect(toDateString(result!)).toBe('2024-02-29');
  });
});

describe('addDays', () => {
  it('adds days correctly', () => {
    const start = parseFecha('2026-08-10')!;
    const result = addDays(start, 5);
    expect(toDateString(result)).toBe('2026-08-15');
  });

  it('crosses month boundary', () => {
    const start = parseFecha('2026-01-30')!;
    const result = addDays(start, 3);
    expect(toDateString(result)).toBe('2026-02-02');
  });

  it('crosses year boundary', () => {
    const start = parseFecha('2026-12-30')!;
    const result = addDays(start, 3);
    expect(toDateString(result)).toBe('2027-01-02');
  });
});

describe('isValidFechaFormato', () => {
  it('accepts valid format', () => {
    expect(isValidFechaFormato('2026-08-05')).toBe(true);
  });

  it('rejects invalid format', () => {
    expect(isValidFechaFormato('05-08-2026')).toBe(false);
    expect(isValidFechaFormato('2026/08/05')).toBe(false);
    expect(isValidFechaFormato('')).toBe(false);
  });
});

describe('isValidFecha', () => {
  it('accepts valid dates', () => {
    expect(isValidFecha('2026-01-01')).toBe(true);
    expect(isValidFecha('2026-12-31')).toBe(true);
    expect(isValidFecha('2024-02-29')).toBe(true);
  });

  it('rejects invalid dates', () => {
    expect(isValidFecha('2026-02-31')).toBe(false);
    expect(isValidFecha('2026-13-01')).toBe(false);
    expect(isValidFecha('2026-00-01')).toBe(false);
    expect(isValidFecha('2026-01-00')).toBe(false);
    expect(isValidFecha('2026-01-32')).toBe(false);
  });

  it('rejects non-leap-year Feb 29', () => {
    expect(isValidFecha('2026-02-29')).toBe(false);
  });
});

describe('isValidHora', () => {
  it('accepts valid times', () => {
    expect(isValidHora('00:00')).toBe(true);
    expect(isValidHora('23:59')).toBe(true);
    expect(isValidHora('14:30')).toBe(true);
  });

  it('rejects invalid times', () => {
    expect(isValidHora('24:00')).toBe(false);
    expect(isValidHora('12:60')).toBe(false);
    expect(isValidHora('12:5')).toBe(false);
    expect(isValidHora('invalid')).toBe(false);
    expect(isValidHora('')).toBe(false);
  });
});

describe('normalizeHora', () => {
  it('adds seconds to valid time', () => {
    expect(normalizeHora('08:00')).toBe('08:00:00');
  });

  it('returns null for invalid time', () => {
    expect(normalizeHora('25:70')).toBeNull();
    expect(normalizeHora('invalid')).toBeNull();
    expect(normalizeHora('')).toBeNull();
  });
});

describe('buildDuplicateKeys', () => {
  it('returns keys for non-cancelled recolecciones with agricultor', () => {
    const items = [
      {
        estado: 'pendiente',
        fk_agricultor: 1,
        fecha_recoleccion: '2026-08-10',
      },
      { estado: 'en_ruta', fk_agricultor: 2, fecha_recoleccion: '2026-08-10' },
    ];
    const keys = buildDuplicateKeys(items);
    expect(keys.has('1|2026-08-10')).toBe(true);
    expect(keys.has('2|2026-08-10')).toBe(true);
  });

  it('excludes cancelados', () => {
    const items = [
      {
        estado: 'cancelado',
        fk_agricultor: 1,
        fecha_recoleccion: '2026-08-10',
      },
      {
        estado: 'pendiente',
        fk_agricultor: 2,
        fecha_recoleccion: '2026-08-10',
      },
    ];
    const keys = buildDuplicateKeys(items);
    expect(keys.has('1|2026-08-10')).toBe(false);
    expect(keys.has('2|2026-08-10')).toBe(true);
  });

  it('excludes items without agricultor', () => {
    const items = [
      {
        estado: 'pendiente',
        fk_agricultor: null,
        fecha_recoleccion: '2026-08-10',
      },
    ];
    const keys = buildDuplicateKeys(items);
    expect(keys.size).toBe(0);
  });

  it('returns empty set for empty input', () => {
    expect(buildDuplicateKeys([]).size).toBe(0);
  });
});

describe('esRecoleccionDuplicada', () => {
  const items = [
    { estado: 'pendiente', fk_agricultor: 1, fecha_recoleccion: '2026-08-10' },
  ];

  it('detects duplicate', () => {
    expect(esRecoleccionDuplicada(items, 1, '2026-08-10')).toBe(true);
  });

  it('returns false for different agricultor', () => {
    expect(esRecoleccionDuplicada(items, 2, '2026-08-10')).toBe(false);
  });

  it('returns false for null agricultor', () => {
    expect(esRecoleccionDuplicada(items, null, '2026-08-10')).toBe(false);
  });
});

describe('validateProgramarForm', () => {
  it('returns null for valid form', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '2026-08-10',
        horaInicio: '09:00',
        horaFin: '11:00',
      }),
    ).toBeNull();
  });

  it('rejects without agricultor', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: false,
        fecha: '2026-08-10',
        horaInicio: '',
        horaFin: '',
      }),
    ).toBe('Selecciona un agricultor.');
  });

  it('rejects invalid date format', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: 'invalid',
        horaInicio: '',
        horaFin: '',
      }),
    ).toBe('La fecha debe tener el formato AAAA-MM-DD.');
  });

  it('rejects impossible date', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '2026-02-31',
        horaInicio: '',
        horaFin: '',
      }),
    ).toBe('La fecha ingresada no es válida.');
  });

  it('rejects past date', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '2020-01-01',
        horaInicio: '',
        horaFin: '',
      }),
    ).toBe('La fecha no puede ser anterior a hoy.');
  });

  it('rejects invalid hora inicio', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '2026-08-10',
        horaInicio: '25:00',
        horaFin: '',
      }),
    ).toBe('La hora de inicio debe tener el formato HH:MM.');
  });

  it('rejects invalid hora fin', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '2026-08-10',
        horaInicio: '09:00',
        horaFin: 'invalid',
      }),
    ).toBe('La hora de fin debe tener el formato HH:MM.');
  });

  it('rejects hora fin before hora inicio', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '2026-08-10',
        horaInicio: '10:00',
        horaFin: '09:00',
      }),
    ).toBe('La hora de fin debe ser posterior a la de inicio.');
  });
});
