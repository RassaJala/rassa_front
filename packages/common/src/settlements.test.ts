import {
  buildLiquidacionesUrl,
  COMISION_RASSA,
  ESTADO_PAGADA,
  ESTADO_PENDIENTE,
  resolveSettlementAmounts,
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

    it('R4-4: throws when data is null instead of passing it through', () => {
      expect(() =>
        unwrapLiquidacionesEnvelope({ ok: true, data: null }),
      ).toThrow('Error en la respuesta del servidor');
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

  describe('resolveSettlementAmounts', () => {
    it('passes valid server values through unchanged (no estimate)', () => {
      expect(
        resolveSettlementAmounts({
          monto_ventas: '1000.00',
          comision: '100.00',
          monto_liquidar: '900.00',
        }),
      ).toEqual({
        montoVentas: 1000,
        comision: 100,
        montoLiquidar: 900,
        isEstimated: false,
      });
    });

    it('falls back to monto_ventas − comision with the estimate flag when monto_liquidar is null', () => {
      expect(
        resolveSettlementAmounts({
          monto_ventas: '1000.00',
          comision: '100.00',
          monto_liquidar: null,
        }),
      ).toEqual({
        montoVentas: 1000,
        comision: 100,
        montoLiquidar: 900,
        isEstimated: true,
      });
    });

    it('falls back with the estimate flag when monto_liquidar is unparseable (NaN)', () => {
      expect(
        resolveSettlementAmounts({
          monto_ventas: '1000.00',
          comision: '100.00',
          monto_liquidar: 'abc',
        }),
      ).toEqual({
        montoVentas: 1000,
        comision: 100,
        montoLiquidar: 900,
        isEstimated: true,
      });
    });

    it('treats 0 as a legitimate server value (no fallback, no estimate)', () => {
      expect(
        resolveSettlementAmounts({
          monto_ventas: '1000.00',
          comision: '100.00',
          monto_liquidar: '0.00',
        }),
      ).toEqual({
        montoVentas: 1000,
        comision: 100,
        montoLiquidar: 0,
        isEstimated: false,
      });
    });

    it('derives the commission as 10% of sales when comision is null and flags the estimate', () => {
      expect(
        resolveSettlementAmounts({
          monto_ventas: '1000.00',
          comision: null,
          monto_liquidar: '900.00',
        }),
      ).toEqual({
        montoVentas: 1000,
        comision: 100,
        montoLiquidar: 900,
        isEstimated: true,
      });
    });

    it('falls back when monto_liquidar is absent (undefined) and derives comision', () => {
      expect(
        resolveSettlementAmounts({
          monto_ventas: '500.00',
          comision: '50.00',
          monto_liquidar: undefined,
        }),
      ).toEqual({
        montoVentas: 500,
        comision: 50,
        montoLiquidar: 450,
        isEstimated: true,
      });
    });

    it('keeps a legitimate zero ventas with a zero liquidar as-is', () => {
      expect(
        resolveSettlementAmounts({
          monto_ventas: '0.00',
          comision: '0.00',
          monto_liquidar: '0.00',
        }),
      ).toEqual({
        montoVentas: 0,
        comision: 0,
        montoLiquidar: 0,
        isEstimated: false,
      });
    });
  });
});
