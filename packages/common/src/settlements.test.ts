import {
  buildLiquidacionesUrl,
  COMISION_RASSA,
  ESTADO_PAGADA,
  ESTADO_PENDIENTE,
  unwrapLiquidacionesEnvelope,
} from './settlements';

describe('settlements common module', () => {
  describe('buildLiquidacionesUrl', () => {
    it('returns the bare list URL when no params are given', () => {
      expect(buildLiquidacionesUrl()).toBe('/liquidaciones/');
      expect(buildLiquidacionesUrl({})).toBe('/liquidaciones/');
    });

    it('builds the URL with every filter param', () => {
      expect(
        buildLiquidacionesUrl({
          agricultor: 3,
          estado: 'pagada',
          periodo_inicio: '2026-07-01',
          periodo_fin: '2026-07-31',
        }),
      ).toBe(
        '/liquidaciones/?agricultor=3&estado=pagada&periodo_inicio=2026-07-01&periodo_fin=2026-07-31',
      );
    });

    it('omits empty params and keeps only the provided ones', () => {
      expect(
        buildLiquidacionesUrl({
          estado: 'pendiente',
          periodo_fin: '2026-07-31',
        }),
      ).toBe('/liquidaciones/?estado=pendiente&periodo_fin=2026-07-31');
    });

    it('serializes the agricultor id as a number string', () => {
      expect(buildLiquidacionesUrl({ agricultor: 42 })).toBe(
        '/liquidaciones/?agricultor=42',
      );
    });
  });

  describe('unwrapLiquidacionesEnvelope', () => {
    it('returns data when ok is true and data exists', () => {
      const data = { results: [] };
      expect(unwrapLiquidacionesEnvelope({ ok: true, data })).toEqual(data);
    });

    it('throws the server message when ok is false', () => {
      expect(() =>
        unwrapLiquidacionesEnvelope({
          ok: false,
          message: 'Error interno',
        }),
      ).toThrow('Error interno');
    });

    it('throws a default message when data is missing', () => {
      expect(() => unwrapLiquidacionesEnvelope({ ok: true })).toThrow(
        'Error en la respuesta del servidor',
      );
    });
  });

  describe('constants', () => {
    it('defines the RASSA commission as 10%', () => {
      expect(COMISION_RASSA).toBe(0.1);
    });

    it('defines both settlement estados', () => {
      expect(ESTADO_PENDIENTE).toBe('pendiente');
      expect(ESTADO_PAGADA).toBe('pagada');
    });
  });
});
