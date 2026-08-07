import { describe, expect, it, vi } from 'vitest';

import {
  addDays,
  buildDuplicateKeys,
  esRecoleccionDuplicada,
  formatFechaHeader,
  formatHora,
  isValidFecha,
  isValidFechaFormato,
  isValidHora,
  normalizeHora,
  ocupaFechaParaDuplicado,
  parseFecha,
  recoleccionDuplicateKey,
  toDateString,
  todayString,
  validateProgramarForm,
} from './recolecciones';

describe('toDateString', () => {
  it('formats with zero padding', () => {
    expect(toDateString(new Date(2026, 7, 5))).toBe('2026-08-05');
    expect(toDateString(new Date(2026, 0, 3))).toBe('2026-01-03');
  });

  it('handles single-digit day', () => {
    expect(toDateString(new Date(2026, 6, 1))).toBe('2026-07-01');
  });
});

describe('todayString', () => {
  it('returns a valid AAAA-MM-DD string', () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('depends on the system clock (fake time)', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 7, 1, 12, 0, 0));
      expect(todayString()).toBe('2026-08-01');
      vi.setSystemTime(new Date(2026, 11, 31, 23, 30, 0));
      expect(todayString()).toBe('2026-12-31');
      vi.setSystemTime(new Date(2026, 0, 3, 0, 5, 0));
      expect(todayString()).toBe('2026-01-03');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('isValidFecha', () => {
  it('accepts real calendar dates', () => {
    expect(isValidFecha('2026-02-28')).toBe(true);
    expect(isValidFecha('2024-02-29')).toBe(true);
    expect(isValidFecha('2026-08-01')).toBe(true);
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidFecha('2025-02-29')).toBe(false);
    expect(isValidFecha('2026-02-31')).toBe(false);
    expect(isValidFecha('2026-04-31')).toBe(false);
  });

  it('rejects out-of-range months and days', () => {
    expect(isValidFecha('2026-13-01')).toBe(false);
    expect(isValidFecha('2026-00-10')).toBe(false);
    expect(isValidFecha('2026-01-00')).toBe(false);
    expect(isValidFecha('2026-01-32')).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isValidFecha('')).toBe(false);
    expect(isValidFecha('abc')).toBe(false);
    expect(isValidFecha('2026-1-01')).toBe(false);
    expect(isValidFecha('2026-01-1')).toBe(false);
    expect(isValidFecha('01/01/2026')).toBe(false);
  });
});

describe('isValidFechaFormato', () => {
  it('accepts the AAAA-MM-DD shape', () => {
    expect(isValidFechaFormato('2026-08-01')).toBe(true);
    expect(isValidFechaFormato('2026-02-31')).toBe(true);
  });

  it('rejects malformed shapes', () => {
    expect(isValidFechaFormato('2026-8-01')).toBe(false);
    expect(isValidFechaFormato('01/01/2026')).toBe(false);
    expect(isValidFechaFormato('abc')).toBe(false);
    expect(isValidFechaFormato('')).toBe(false);
  });
});

describe('parseFecha', () => {
  it('parses a valid date', () => {
    const date = parseFecha('2026-08-01');
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(7);
    expect(date?.getDate()).toBe(1);
  });

  it('returns null for invalid dates', () => {
    expect(parseFecha('2026-02-31')).toBeNull();
    expect(parseFecha('nope')).toBeNull();
  });
});

describe('addDays', () => {
  it('adds and subtracts days across month boundaries', () => {
    const jan31 = new Date(2026, 0, 31);
    expect(toDateString(addDays(jan31, 1))).toBe('2026-02-01');

    const mar1 = new Date(2026, 2, 1);
    expect(toDateString(addDays(mar1, -1))).toBe('2026-02-28');
  });

  it('rolls over year boundaries', () => {
    const dec31 = new Date(2026, 11, 31);
    expect(toDateString(addDays(dec31, 1))).toBe('2027-01-01');
  });
});

describe('formatFechaHeader', () => {
  it('labels today and tomorrow', () => {
    expect(formatFechaHeader('2026-08-01', '2026-08-01')).toBe('Hoy');
    expect(formatFechaHeader('2026-08-02', '2026-08-01')).toBe('Mañana');
  });

  it('formats other dates with weekday and month', () => {
    expect(formatFechaHeader('2026-08-08', '2026-08-01')).toBe(
      'Sábado, 8 de agosto',
    );
  });

  it('returns the raw string for invalid dates', () => {
    expect(formatFechaHeader('no-es-fecha', '2026-08-01')).toBe('no-es-fecha');
  });
});

describe('formatHora', () => {
  it('returns empty for falsy values', () => {
    expect(formatHora(null)).toBe('');
    expect(formatHora('')).toBe('');
  });

  it('slices to HH:MM', () => {
    expect(formatHora('08:00:00')).toBe('08:00');
    expect(formatHora('23:59:59')).toBe('23:59');
  });
});

describe('isValidHora', () => {
  it('accepts valid times', () => {
    expect(isValidHora('08:00')).toBe(true);
    expect(isValidHora('23:59')).toBe(true);
  });

  it('rejects invalid times', () => {
    expect(isValidHora('24:00')).toBe(false);
    expect(isValidHora('12:60')).toBe(false);
    expect(isValidHora('8:00')).toBe(false);
    expect(isValidHora('ab:cd')).toBe(false);
    expect(isValidHora('')).toBe(false);
  });
});

describe('normalizeHora', () => {
  it('appends seconds', () => {
    expect(normalizeHora('08:00')).toBe('08:00:00');
    expect(normalizeHora('14:30')).toBe('14:30:00');
  });
});

describe('recoleccionDuplicateKey', () => {
  it('combines agricultor and fecha', () => {
    expect(recoleccionDuplicateKey(10, '2026-08-01')).toBe('10|2026-08-01');
  });
});

describe('esRecoleccionDuplicada', () => {
  const base = [
    { estado: 'pendiente', fk_agricultor: 10, fecha_recoleccion: '2026-08-01' },
    {
      estado: 'recolectado',
      fk_agricultor: 11,
      fecha_recoleccion: '2026-08-01',
    },
  ];

  it('detects an active duplicate for the same agricultor and fecha', () => {
    expect(esRecoleccionDuplicada(base, 10, '2026-08-01')).toBe(true);
  });

  it('ignores cancelled recolecciones', () => {
    const list = [
      {
        estado: 'cancelado',
        fk_agricultor: 10,
        fecha_recoleccion: '2026-08-01',
      },
    ];
    expect(esRecoleccionDuplicada(list, 10, '2026-08-01')).toBe(false);
  });

  it('returns false for null agricultor', () => {
    expect(esRecoleccionDuplicada(base, null, '2026-08-01')).toBe(false);
  });

  it('returns false when fecha differs', () => {
    expect(esRecoleccionDuplicada(base, 10, '2026-08-02')).toBe(false);
  });

  it('detects duplicates across all active states', () => {
    const enRutaList = [
      {
        estado: 'en_ruta',
        fk_agricultor: 10,
        fecha_recoleccion: '2026-08-01',
      },
    ];
    expect(esRecoleccionDuplicada(enRutaList, 10, '2026-08-01')).toBe(true);

    const recolectadoList = [
      {
        estado: 'recolectado',
        fk_agricultor: 10,
        fecha_recoleccion: '2026-08-01',
      },
    ];
    expect(esRecoleccionDuplicada(recolectadoList, 10, '2026-08-01')).toBe(
      true,
    );
  });
});

describe('ocupaFechaParaDuplicado', () => {
  it('es true para estados activos con agricultor', () => {
    expect(
      ocupaFechaParaDuplicado({
        estado: 'pendiente',
        fk_agricultor: 10,
        fecha_recoleccion: '2026-08-01',
      }),
    ).toBe(true);
  });

  it('es false para cancelado o sin agricultor', () => {
    expect(
      ocupaFechaParaDuplicado({
        estado: 'cancelado',
        fk_agricultor: 10,
        fecha_recoleccion: '2026-08-01',
      }),
    ).toBe(false);
    expect(
      ocupaFechaParaDuplicado({
        estado: 'pendiente',
        fk_agricultor: null,
        fecha_recoleccion: '2026-08-01',
      }),
    ).toBe(false);
  });
});

describe('validateProgramarForm', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('valida en orden: agricultor, fecha y horas', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1, 12, 0, 0));

    expect(
      validateProgramarForm({
        agricultorSeleccionado: false,
        fecha: '2026-08-01',
        horaInicio: '',
        horaFin: '',
      }),
    ).toBe('Selecciona un agricultor.');

    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '2026-07-31',
        horaInicio: '',
        horaFin: '',
      }),
    ).toBe('La fecha no puede ser anterior a hoy.');

    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '2026-08-01',
        horaInicio: '09:00',
        horaFin: '08:00',
      }),
    ).toBe('La hora de fin debe ser posterior a la de inicio.');

    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '2026-08-01',
        horaInicio: '',
        horaFin: '',
      }),
    ).toBeNull();
  });

  it('valida malformato de fecha y hora', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '01/08/2026',
        horaInicio: '',
        horaFin: '',
      }),
    ).toBe('La fecha debe tener el formato AAAA-MM-DD.');

    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: todayString(),
        horaInicio: '9:00',
        horaFin: '',
      }),
    ).toBe('La hora de inicio debe tener el formato HH:MM.');
  });

  it('rechaza una fecha con formato válido pero día imposible del calendario', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '2026-02-31',
        horaInicio: '',
        horaFin: '',
      }),
    ).toBe('La fecha ingresada no es válida.');
  });

  it('valida correctamente fechas en año bisiesto', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: '2026-02-29',
        horaInicio: '',
        horaFin: '',
      }),
    ).toBe('La fecha ingresada no es válida.');
  });

  it('valida el formato de la hora de fin', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: todayString(),
        horaInicio: '09:00',
        horaFin: '9:00',
      }),
    ).toBe('La hora de fin debe tener el formato HH:MM.');
  });

  it('rechaza hora de fin sin hora de inicio', () => {
    expect(
      validateProgramarForm({
        agricultorSeleccionado: true,
        fecha: todayString(),
        horaInicio: '',
        horaFin: '09:00',
      }),
    ).toBe('La hora de fin requiere una hora de inicio.');
  });
});

describe('buildDuplicateKeys', () => {
  it('builds keys only for active recolecciones with agricultor', () => {
    const list = [
      {
        estado: 'pendiente',
        fk_agricultor: 10,
        fecha_recoleccion: '2026-08-01',
      },
      {
        estado: 'cancelado',
        fk_agricultor: 11,
        fecha_recoleccion: '2026-08-02',
      },
      {
        estado: 'pendiente',
        fk_agricultor: null,
        fecha_recoleccion: '2026-08-03',
      },
    ];
    expect(buildDuplicateKeys(list)).toEqual(new Set(['10|2026-08-01']));
  });
});
