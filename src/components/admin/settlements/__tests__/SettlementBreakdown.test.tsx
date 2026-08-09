/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { render } from '@testing-library/react-native';

import SettlementBreakdown from '@/components/admin/settlements/SettlementBreakdown';
import type { AdminPalette } from '@/components/admin/merma/colors';

const palette: AdminPalette = {
  surface: '#ffffff',
  fg: '#111111',
  muted: '#666666',
  border: '#e0e0e0',
  brand: '#DE393A',
  bg: '#f5f5f5',
  segBg: '#fef2f2',
  coral: '#DE393A',
};

function renderBreakdown(overrides?: {
  montoVentas?: string;
  comision?: string;
  montoLiquidar?: string;
}) {
  return render(
    <SettlementBreakdown
      montoVentas={overrides?.montoVentas ?? '1500.00'}
      comision={overrides?.comision ?? '150.00'}
      montoLiquidar={overrides?.montoLiquidar ?? '1350.00'}
      palette={palette}
    />,
  );
}

describe('SettlementBreakdown', () => {
  it('derives the commission percentage from the amounts', () => {
    const { getByText } = renderBreakdown({
      montoVentas: '1500.00',
      comision: '150.00',
    });

    expect(getByText('Comisión Rassa (10%)')).toBeTruthy();
    expect(getByText('$150.00')).toBeTruthy();
    expect(getByText('Monto de ventas')).toBeTruthy();
    expect(getByText('A liquidar')).toBeTruthy();
  });

  it('renders a 5% commission when the ratio is 1:20', () => {
    const { getByText } = renderBreakdown({
      montoVentas: '2000.00',
      comision: '100.00',
    });

    expect(getByText('Comisión Rassa (5%)')).toBeTruthy();
  });

  it('rounds the percentage to the nearest integer', () => {
    const { getByText } = renderBreakdown({
      montoVentas: '3333.00',
      comision: '333.00',
    });

    // 333 / 3333 = 0.0999... → 10%.
    expect(getByText('Comisión Rassa (10%)')).toBeTruthy();
  });

  it('guards division by zero and renders (0%) for zero ventas', () => {
    const { getByText } = renderBreakdown({
      montoVentas: '0.00',
      comision: '0.00',
    });

    expect(getByText('Comisión Rassa (0%)')).toBeTruthy();
  });

  it('R3-5: derives label and amounts from a non-round fixture', () => {
    const { getByText } = renderBreakdown({
      montoVentas: '1234.56',
      comision: '98.76',
      montoLiquidar: '1135.80',
    });

    // 98.76 / 1234.56 = 0.0799... → 8%. A round fixture (1500.00 × 10%)
    // could pass even if the component recalculated wrongly; the non-round
    // numbers pin down the exact derivation.
    expect(getByText('Comisión Rassa (8%)')).toBeTruthy();
    expect(getByText('$1234.56')).toBeTruthy();
    expect(getByText('$98.76')).toBeTruthy();
    expect(getByText('$1135.80')).toBeTruthy();
  });
});
